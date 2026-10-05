import { audio } from '../audio/engine';
import { brandStore, INDUSTRIES, useBrand } from './brands';

/** "What do you sell?" — switches every chapter to the visitor's own world. */
export function BrandPicker({ compact = false }: { compact?: boolean }) {
  const brand = useBrand();
  if (compact) {
    return (
      <label className="bp-compact">
        <span>Your brand</span>
        <select
          value={brand.id}
          onChange={(e) => {
            brandStore.set(e.target.value as typeof brand.id);
            audio.click(2200, 0.1);
          }}
        >
          {INDUSTRIES.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <div className="bp" role="radiogroup" aria-label="What do you sell?">
      {INDUSTRIES.map((i, k) => (
        <button
          key={i.id}
          role="radio"
          aria-checked={brand.id === i.id}
          className={brand.id === i.id ? 'is-on' : ''}
          onClick={() => {
            brandStore.set(i.id);
            audio.click(1800 + k * 200, 0.12);
          }}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}
