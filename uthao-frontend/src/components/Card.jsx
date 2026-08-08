export default function Card({ title, children }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-6 shadow-sm">
      {title && <h3 className="text-base font-bold mb-4">{title}</h3>}
      <div>{children}</div>
    </div>
  );
}
