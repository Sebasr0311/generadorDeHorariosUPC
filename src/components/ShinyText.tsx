/** Lightweight Shiny Text animation adapted from the public React Bits component concept.
 *  Keeps the landing dependency-free apart from React; honors reduced motion preferences.
 *  Visual reference: https://reactbits.dev/text-animations/shiny-text
 */
export function ShinyText({children}:{children:React.ReactNode}){
  return <span className="shiny-text">{children}</span>;
}
