import { Fragment, type ReactNode } from "react";

/**
 * Every numeral in the app renders in the number font (--font-num = Roboto),
 * while the surrounding words keep the text font. Digit runs are pulled out of
 * the string and wrapped in a span, so mixed labels such as "1ª quincena ·
 * 01–15 nov" or "3 movimientos" only switch font on their digits.
 */
const NUM_RUN = /[-+−]?\d+(?:[.,]\d+)*/g;

export function Num({ children, className = "" }: { children: ReactNode; className?: string }) {
  if (typeof children !== "string") return <span className={className}>{children}</span>;

  const runs = children.match(NUM_RUN) ?? [];
  if (!runs.length) return <span className={className}>{children}</span>;

  const parts = children.split(NUM_RUN);
  return (
    <span className={className}>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {part}
          {i < runs.length && <span className="font-num tabular-nums">{runs[i]}</span>}
        </Fragment>
      ))}
    </span>
  );
}
