import { Link, useParams } from 'react-router-dom';

export default function Room() {
  const { roomId } = useParams();

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="text-xl font-semibold text-slate-800">Coding room</h1>
        <p className="mt-2 text-sm text-slate-500">The live code editor is coming in the next step.</p>
        <p className="mt-4 break-all rounded-lg bg-slate-100 p-2 font-mono text-xs text-slate-600">
          {roomId}
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}