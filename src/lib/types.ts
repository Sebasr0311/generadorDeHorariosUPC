export type TeacherSource = 'confirmed' | 'estimated' | 'possible' | 'unassigned';
export type Day = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Session = {
  day: Day;
  start: number;
  end: number;
  room: string;
  startDate?: string | null;
  endDate?: string | null;
};
export type Group = {
  id: string;
  label: string;
  teacherId: string | null;
  teacher: string | null;
  teacherSource: TeacherSource;
  sessions: Session[];
  inferredFrom?: string;
  previousTeacher?: string | null;
  reviewNote?: string;
};
export type Subject = { code: string; name: string; groups: Group[] };
export type Catalog = {
  id: string;
  label: string;
  term: string;
  period?: string;
  institution: string;
  program: string;
  teacherMode: string;
  source: string;
  importedAt?: number;
  subjects: Subject[];
  warnings?: string[];
};
export type Choice = {
  code: string;
  curriculumCode?: string;
  teacherId?: string;
  teacherMode?: 'any' | 'only' | 'exclude';
  pinnedGroup?: string;
};
export type Preferences = {
  earliest: number;
  latest: number;
  freeDays: number[];
  mode: 'compact' | 'morning' | 'afternoon' | 'freeDays';
  campusOnly: boolean;
  allowUnknown: boolean;
};
export type Schedule = {
  groups: { code: string; name: string; group: Group }[];
  score: number;
  key: string;
  days: number;
  gaps: number;
  earliest: number;
  latest: number;
};
export type SavedPlan = {
  id: string;
  name: string;
  catalogId: string;
  createdAt: number;
  items: { code: string; groupId: string; curriculumCode?: string }[];
};
export type GroupChange = {
  code: string;
  subjectName: string;
  label: string;
  type: 'new' | 'removed' | 'rescheduled' | 'room' | 'teacher' | 'unchanged';
  detail: string;
};

export type SemesterNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type RomanSemester = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VIII' | 'IX';
export type SemesterFilterValue = 'all' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'other';
export type PensumSelectionMode = 'all' | 'semester';

export type CurriculumMetadata = {
  universidad: string;
  programa: string;
  jornada: string;
  periodosDeclarados: number;
  periodosDetallados: readonly SemesterNumber[];
  periodo10: string;
  periodo10Note: string;
  totalAsignaturasDocumentadas: number;
  totalPonderacionAcademicaDocumentada: number;
  fuente: string;
};

export type CurriculumCourse = {
  code: string;
  name: string;
  displayName?: string;
  semester: SemesterNumber;
  romanSemester: RomanSemester;
  academicWeight: number;
  credits: number;
  ht: number | null;
  hp: number | null;
  htp: number | null;
  requiredCredits: number;
  prerequisiteCodes: string[];
  prerequisiteNames: string[];
};

export type CurriculumSubject = CurriculumCourse;

export type MatchOrigin =
  | 'exact-code-name'
  | 'exact-code-alias'
  | 'unoffered'
  | 'extra-offering'
  | 'review-required';

export type ReconciledSubjectStatus =
  | 'available'
  | 'unoffered'
  | 'extra-offering'
  | 'review-required';

export type ReconciledCatalogItem = {
  id: string;
  kind: 'curriculum' | 'extra';
  status: ReconciledSubjectStatus;
  semester: SemesterNumber | null;
  romanSemester: RomanSemester | null;
  curriculumCode: string;
  curriculumName: string;
  displayName?: string;
  academicWeight: number | null;
  credits: number | null;
  ht: number | null;
  hp: number | null;
  htp: number | null;
  requiredCredits: number;
  prerequisiteCodes: string[];
  prerequisiteNames: string[];
  offering: Subject | null;
  offeringCode: string | null;
  offeringName: string | null;
  choiceCode: string | null;
  matchOrigin: MatchOrigin;
  matchNote?: string;
};

export type ReconciliationIncident = {
  type: 'code-divergence' | 'name-similarity-divergence' | 'review-required' | 'extra-offering';
  curriculumCode?: string;
  curriculumName?: string;
  offeringCode: string;
  offeringName: string;
  detail: string;
};

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const SHORT_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DEFAULT_PREFERENCES: Preferences = {
  earliest: 360,
  latest: 1320,
  freeDays: [],
  mode: 'compact',
  campusOnly: true,
  allowUnknown: true,
};
export const formatHour = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const normalizeGroup = (label: string) =>
  label
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*[-–]\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
export const normalizeName = (name: string) =>
  name
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
export const sessionKey = (session: Session) => `${session.day}:${session.start}:${session.end}`;
export const signature = (group: Group) => group.sessions.map(sessionKey).sort().join('|');
