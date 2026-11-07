import { useRef } from 'react';
import type { HTMLAttributes, MouseEvent } from 'react';

/**
 * Interactive spotlight adapted from the free React Bits SpotlightCard visual pattern.
 * Reference: https://reactbits.dev/components/spotlight-card
 * Uses native CSS variables: no runtime canvas, no external animation dependency.
 */
export function SpotlightCard({className = '', children, ...props}:HTMLAttributes<HTMLElement>){
  const ref = useRef<HTMLElement>(null);
  function move(event:MouseEvent<HTMLElement>){
    const rect=ref.current?.getBoundingClientRect();
    if(!rect)return;
    ref.current?.style.setProperty('--spotlight-x',`${event.clientX-rect.left}px`);
    ref.current?.style.setProperty('--spotlight-y',`${event.clientY-rect.top}px`);
  }
  return <article {...props} ref={ref} onMouseMove={move} className={`reactbits-spotlight ${className}`.trim()}>{children}</article>;
}
