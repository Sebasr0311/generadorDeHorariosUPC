"""Extrae catálogo de ejemplo de PDF Academusoft utilizando posiciones, sin OCR.
El resultado NO incluye números de identificación de los docentes (se sustituyen por IDs opacos).
Uso: python scripts/extract_seed.py entrada.pdf src/data/catalogo-base.json
"""
import sys,fitz,re,json,hashlib,unicodedata,collections,datetime
from pathlib import Path

DAYNAMES=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']
BOUNDARIES=[68,168,270,378,479,584,688,783]
TITLE_RE=re.compile(r'([A-Z]{2,5}\d{2,4}[A-Z]?)\s*-\s*(.*?)\s*-\s*Estado\s*:',re.I)
TIME_RE=re.compile(r'(?<!\d)(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})')
DATE_RE=re.compile(r'\b\d{2}-\d{2}-\d{4}\b')
ID_RE=re.compile(r'^\d{7,10}$')

def textlines(page):
    result=[]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            t=' '.join(s['text'] for s in line.get('spans',[])).strip()
            if not t:continue
            x0,y0,x1,y1=line['bbox']
            result.append({'x':x0,'cx':(x0+x1)/2,'y':y0,'text':t})
    return sorted(result,key=lambda l:(l['y'],l['x']))

def teacher_id(raw):
    return 'doc-'+hashlib.sha256(('upc-schedule:'+raw).encode()).hexdigest()[:12]

def extract(path):
    pdf=fitz.open(path)
    page_lines=[textlines(p) for p in pdf]
    teachers={}
    for page_index in (0,1):
        lines=page_lines[page_index]
        stop=849 if page_index==1 else 1150
        ids=[l for l in lines if l['x']<180 and ID_RE.fullmatch(l['text']) and l['y']<stop]
        names=[l for l in lines if 350<l['x']<590 and l['y']<stop and re.fullmatch(r'[A-ZÁÉÍÓÚÑÜ. ]{8,}',l['text'])]
        for ident in ids:
            possible=[n for n in names if abs(n['y']-ident['y'])<2.0]
            if possible:teachers[ident['text']]=possible[0]['text'].strip()
    titles=[]
    prev=None
    events=[]
    warnings=[]
    regions=collections.defaultdict(list)
    for pi,lines in enumerate(page_lines):
        headings=[]
        for l in lines:
            m=TITLE_RE.search(l['text'])
            if m:
                headings.append((l['y'],m.group(1).upper(),m.group(2).strip()))
        headings.sort()
        bounds=[(0.0,headings[0][0],prev)] if headings else [(0.0,1140.0,prev)]
        for n,h in enumerate(headings):
            nxt=headings[n+1][0] if n+1<len(headings) else 1140.0
            bounds.append((h[0]+4,nxt,h[1]))
            titles.append((h[1],h[2]))
        for start,end,subject in bounds:
            if not subject or end-start<12: continue
            region=[l for l in lines if start<=l['y']<end and 68<=l['cx']<=783 and 'Estado :' not in l['text'] and 'PÃ¡g.' not in l['text'] and not any(l['text']==d for d in DAYNAMES)]
            for day in range(7):
                regions[subject,day].extend([{**l,'y':pi*1200+l['y']} for l in region if BOUNDARIES[day]<=l['cx']<BOUNDARIES[day+1]])
        if headings:prev=headings[-1][1]
    for (subject,day),col in regions.items():
        col.sort(key=lambda l:(l['y'],l['x']))
        pos=[i for i,l in enumerate(col) if re.search(r'Grupo\s*:',l['text'],re.I)]
        for ix,st in enumerate(pos):
            chunk=col[st:(pos[ix+1] if ix+1<len(pos) else len(col))]
            tm=next(((k,TIME_RE.search(l['text'])) for k,l in enumerate(chunk) if TIME_RE.search(l['text'])),None)
            if not tm: warnings.append(f'{subject} día {day}: grupo sin hora: '+ ' / '.join(c['text'] for c in chunk[:4])); continue
            idx,match=tm
            entries=[c['text'].strip() for c in chunk[:idx]]
            dates=[]
            for c in chunk[idx:]: dates.extend(DATE_RE.findall(c['text']))
            first=entries[0]
            g=first.split(':',1)[1].strip()
            docidx=None
            for j,t in enumerate(entries[1:],1):
                if ID_RE.fullmatch(t) or t=='NDOC':docidx=j;break
            if docidx is None:
                warnings.append(f'{subject} día {day}: docente sin identificar '+str(entries[:6]));continue
            if docidx>1:g=' '.join([g]+entries[1:docidx]).strip()
            g=re.sub(r'\s+',' ',g).strip(' -')
            teacher_tokens=[]
            room_index=docidx
            while room_index<len(entries) and (ID_RE.fullmatch(entries[room_index]) or entries[room_index]=='NDOC'):
                teacher_tokens.append(entries[room_index]);room_index+=1
            raw=teacher_tokens[0] if len(teacher_tokens)==1 else 'NDOC'
            room=' '.join(entries[room_index:]).strip() or 'NREF'
            if not g:
                warnings.append(f'{subject} día {day}: grupo vacío');continue
            if len(teacher_tokens)>1:
                warnings.append(f'{subject} grupo {g}: varios docentes listados; asignación por verificar')
            if raw!='NDOC' and raw not in teachers:
                warnings.append(f'{subject} grupo {g}: docente ausente del directorio')
            starttime,endtime=match.groups()
            def minute(t):
                h,m=map(int,t.split(':'));return h*60+m
            startmin=minute(starttime);endmin=minute(endtime)+1
            if startmin>=endmin or endmin>1440:continue
            events.append(dict(subjectCode=subject,group=g,day=day,start=startmin,end=endmin,teacherId=teacher_id(raw) if raw!='NDOC' else None,teacher=teachers.get(raw) if raw!='NDOC' else None,room=room,startDate=dates[0] if len(dates)>0 else None,endDate=dates[1] if len(dates)>1 else None))
    names=dict(titles)
    bysub={}
    for event in events:
        code=event.pop('subjectCode')
        sub=bysub.setdefault(code,{'code':code,'name':names[code],'groups':{}})
        key=event.pop('group')
        gr=sub['groups'].setdefault(key,{'id':code+'::'+key,'label':key,'teacherId':event['teacherId'],'teacher':event['teacher'],'teacherSource':'confirmed' if event['teacher'] else 'unassigned','sessions':[]})
        sess={k:event[k] for k in ['day','start','end','room','startDate','endDate']}
        if not any(a['day']==sess['day'] and a['start']==sess['start'] and a['end']==sess['end'] and a['room']==sess['room'] for a in gr['sessions']):gr['sessions'].append(sess)
        if gr['teacherId']!=event['teacherId']:
            warnings.append(f'{code} {key}: tiene docentes distintos en diferentes sesiones')
    subjects=[]
    for code,sub in sorted(bysub.items()):
        sub['groups']=sorted(sub['groups'].values(),key=lambda x:x['label'])
        for gr in sub['groups']:gr['sessions'].sort(key=lambda s:(s['day'],s['start']))
        subjects.append(sub)
    return dict(id='upc-2026-2',label='2026-2 · Catálogo de referencia',term='2026-2',period='03-08-2026 al 15-12-2026',institution='Universidad Popular del Cesar',program='Ingeniería de Sistemas',teacherMode='confirmed',source='PDF Academusoft · 26/10/2026',subjects=subjects),warnings,events

if __name__=='__main__':
    obj,warnings,events=extract(sys.argv[1])
    out=Path(sys.argv[2]);out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf8')
    print('Materias',len(obj['subjects']),'Grupos',sum(len(s['groups']) for s in obj['subjects']),'Clases únicas',sum(len(g['sessions']) for s in obj['subjects'] for g in s['groups']),'raw',len(events),'warnings',len(warnings))
    for w in warnings[:35]:print('WARN:',w)
    for s in obj['subjects']:
      print(s['code'],s['name'],'grupos',len(s['groups']),'sesiones',sum(len(g['sessions']) for g in s['groups']))
