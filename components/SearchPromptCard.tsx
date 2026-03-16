'use client';

interface SearchPromptCardProps {
  title: string;
  query: string;
  price: string;
  image: string;
  onSearch: (query: string) => void;
}

export default function SearchPromptCard({ title, query, price, image, onSearch }: SearchPromptCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSearch(query)}
      className="group relative overflow-hidden rounded-2xl bg-white text-left transition-all hover:shadow-lg"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-neutral-100">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>
      <div className="p-4">
        <p className="font-naya-serif text-sm font-light text-text-primary line-clamp-2">{title.toLowerCase()}</p>
        <p className="mt-1 text-xs text-text-muted">{price}</p>
        <p className="mt-2 text-[10px] uppercase tracking-[0.15em] text-black/30 transition-colors group-hover:text-black/50">search</p>
      </div>
    </button>
  );
}
