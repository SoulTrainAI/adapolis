/* eslint-disable @next/next/no-img-element -- a static SVG; next/image adds nothing here */

/** The ADApolis mark: a Colosseum inside a gold laurel wreath. */
export function LogoMark({ size = 36, className = '' }: { size?: number; className?: string }) {
  return <img src="/brand/adapolis-mark.svg" alt="" width={size} height={size} className={className} />;
}

/** Mark plus the two-tone wordmark (ADA bold, polis light lilac). */
export function Logo({ size = 36, textClass = 'text-xl' }: { size?: number; textClass?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className={`font-display tracking-tight leading-none ${textClass}`}>
        <span className="font-bold text-white">ADA</span>
        <span className="font-normal text-brand-lilac">polis</span>
      </span>
    </span>
  );
}
