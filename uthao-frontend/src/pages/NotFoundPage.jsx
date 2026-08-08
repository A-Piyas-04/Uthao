import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="text-center py-24 px-4">
      <h1 className="text-6xl font-extrabold">404</h1>
      <p className="text-neutral-600 my-2 mb-6">We couldn't find that page.</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-full text-sm font-bold px-6 py-3.5 bg-black text-white hover:bg-neutral-800 transition-colors no-underline"
      >
        Go home
      </Link>
    </div>
  );
}
