import { AE, AU, BR, CA, DE, ES, FR, GB, IN, IT, JP, MX, SG, US } from 'country-flag-icons/react/3x2';
import { ArrowUp, ArrowDown, ArrowUpDown, Minus } from 'lucide-react';

const flags = { AE, AU, BR, CA, DE, ES, FR, GB, IN, IT, JP, MX, SG, US };
// Dark flag-inspired accents preserve contrast on the pale summary cards.
export const flagColors = { AE: '#087548', AU: '#17428a', BR: '#147443', CA: '#b62838', DE: '#916000', ES: '#a92136', FR: '#244990', GB: '#204589', IN: '#a14e0b', IT: '#087548', JP: '#b52848', MX: '#087548', SG: '#b52848', US: '#a32e44' };

export function MarketIdentity({ market }) {
  const Flag = flags[market.id];
  return <b className="ex-market-identity" aria-label={market.name}>{Flag && <Flag aria-hidden="true" className="ex-country-flag" />}<span>{market.id}</span></b>;
}

export function MarketTrend({ valid, min, max }) {
  const state = !valid.length ? 'unavailable' : min < 0 && max > 0 ? 'mixed' : max > 0 ? 'up' : min < 0 ? 'down' : 'flat';
  const Icon = state === 'up' ? ArrowUp : state === 'down' ? ArrowDown : state === 'mixed' ? ArrowUpDown : Minus;
  const label = { up: 'Increase', down: 'Decrease', mixed: 'Mixed changes across comparison years', flat: 'Unchanged', unavailable: 'Trend unavailable' }[state];
  return <span className={`ex-number-trend ex-number-trend-${state}`} role="img" aria-label={label} title={label}><Icon size={12} strokeWidth={2.5} aria-hidden="true" /></span>;
}
