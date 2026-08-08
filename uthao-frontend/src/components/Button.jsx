const VARIANTS = {
  primary: "px-6 py-3.5 bg-black text-white hover:bg-neutral-800",
  secondary: "px-6 py-3.5 bg-white text-black border border-black hover:bg-neutral-100",
  ghost: "px-3 py-2 bg-transparent text-black hover:bg-neutral-100",
};

export default function Button({
  children,
  variant = "primary",
  full = false,
  className = "",
  ...rest
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${full ? "w-full" : ""} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
