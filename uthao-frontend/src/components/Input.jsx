export default function Input({ label, id, className = "", ...rest }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold text-neutral-600">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`px-3.5 py-3 border-[1.5px] border-neutral-200 rounded-md text-[15px] bg-white text-black focus:outline-none focus:border-black transition-colors ${className}`}
        {...rest}
      />
    </div>
  );
}
