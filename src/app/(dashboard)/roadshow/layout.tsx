import { MobileNav } from "@/components/roadshow/mobile-nav";

export default function RoadshowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="pb-20 md:pb-0">{children}</div>
      <MobileNav />
    </>
  );
}
