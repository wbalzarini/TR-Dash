import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <section className={`card ${className}`}>{children}</section>;
}

type CardHeaderProps = {
  title: string;
  icon?: ReactNode;
  /** Rendered on the right of the header row — usually a timestamp or badge. */
  aside?: ReactNode;
};

export function CardHeader({ title, icon, aside }: CardHeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
      <h2 className="eyebrow flex items-center gap-2 whitespace-nowrap">
        {icon}
        {title}
      </h2>
      {aside}
    </header>
  );
}
