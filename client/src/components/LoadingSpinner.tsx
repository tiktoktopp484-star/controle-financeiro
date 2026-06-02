export default function LoadingSpinner({ text = "Carregando..." }: { text?: string }) {
  return (
    <div className="flex justify-center py-12">
      <div className="text-center">
        <div className="spinner mx-auto mb-3" style={{ width: 32, height: 32 }} />
        <p className="text-sm" style={{ color: "#A09880" }}>{text}</p>
      </div>
    </div>
  );
}
