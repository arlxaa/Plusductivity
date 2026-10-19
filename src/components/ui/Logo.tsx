// The "+" is the brand: logo, favicon, and every "add new" button.
// Pink rounded mark (like the reference's bold logo shape) + wide wordmark,
// with the "+" punched in dark and a mint micro-dot accent.
export default function Logo() {
  return (
    <a href="/" className="group flex items-center gap-2" aria-label="plusductivity home">
      <span
        aria-hidden
        className="relative grid size-8 place-items-center rounded-xl bg-accent-pink text-2xl font-black leading-none text-black transition-transform group-hover:rotate-90"
      >
        <span className="-mt-0.5">+</span>
        <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent-mint" />
      </span>
      <span className="font-display text-lg tracking-tight">
        <span className="text-accent-pink">plus</span>ductivity
      </span>
    </a>
  );
}
