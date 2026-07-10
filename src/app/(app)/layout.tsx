import { Nav } from "@/components/Nav";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        {children}
      </main>
    </>
  );
}
