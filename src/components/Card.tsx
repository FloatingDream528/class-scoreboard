interface Props {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

export default function Card({ children, className = "", title }: Props) {
  return (
    <article className={`card ${className}`}>
      {title && <h2>{title}</h2>}
      {children}
    </article>
  );
}
