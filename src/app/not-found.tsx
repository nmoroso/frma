import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-frma py-28 text-center">
      <p className="eyebrow">Error 404</p>
      <h1 className="h2 mt-3">No encontramos esta página</h1>
      <Link href="/" className="btn-primary mt-8">Volver al inicio</Link>
    </div>
  );
}
