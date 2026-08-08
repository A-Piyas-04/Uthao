export default function Loader() {
  return (
    <div className="flex justify-center py-8" role="status" aria-label="Loading">
      <span className="w-7 h-7 rounded-full border-[3px] border-neutral-200 border-t-black animate-spin" />
    </div>
  );
}
