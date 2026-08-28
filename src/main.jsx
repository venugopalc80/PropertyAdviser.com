import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const listings = [
  { id: 1, image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=85', price: '$895,000', beds: 4, baths: 3, sqft: '2,640', type: 'Single Family', city: 'Austin, TX', address: '1804 Westlake Dr', featured: true },
  { id: 2, image: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=85', price: '$1,245,000', beds: 3, baths: 2.5, sqft: '2,110', type: 'Condo', city: 'Miami, FL', address: '285 Biscayne Blvd', featured: true },
  { id: 3, image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=85', price: '$749,000', beds: 3, baths: 2, sqft: '1,980', type: 'Townhouse', city: 'Charlotte, NC', address: '912 Queens Rd', featured: false },
  { id: 4, image: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=85', price: '$2,095,000', beds: 5, baths: 4, sqft: '4,350', type: 'Single Family', city: 'Scottsdale, AZ', address: '7442 N Sunset Blvd', featured: true },
  { id: 5, image: 'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=85', price: '$589,000', beds: 2, baths: 2, sqft: '1,240', type: 'Condo', city: 'Denver, CO', address: '1550 Larimer St', featured: false },
  { id: 6, image: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=85', price: '$1,650,000', beds: 4, baths: 3.5, sqft: '3,120', type: 'Single Family', city: 'Nashville, TN', address: '4211 Belle Meade Blvd', featured: false },
];

function SearchBar({ mode, setMode }) {
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState('Any home type');
  const [beds, setBeds] = useState('Any beds');

  return <div className="search-panel">
    <div className="mode-tabs">
      {['Buy', 'Rent'].map(item => <button key={item} className={mode === item ? 'active' : ''} onClick={() => setMode(item)}>{item}</button>)}
    </div>
    <div className="search-fields">
      <label><span>Location</span><input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, ZIP or neighborhood" /></label>
      <label><span>Price</span><select><option>Any price</option><option>Under $500k</option><option>$500k - $1M</option><option>$1M - $2M</option><option>$2M+</option></select></label>
      <label><span>Home type</span><select value={propertyType} onChange={e => setPropertyType(e.target.value)}><option>Any home type</option><option>Single Family</option><option>Condo</option><option>Townhouse</option></select></label>
      <label><span>Beds</span><select value={beds} onChange={e => setBeds(e.target.value)}><option>Any beds</option><option>1+</option><option>2+</option><option>3+</option><option>4+</option></select></label>
      <button className="search-button">Search homes</button>
    </div>
  </div>;
}

function ListingCard({ listing }) {
  const [saved, setSaved] = useState(false);
  return <article className="card">
    <div className="image-wrap"><img src={listing.image} alt={listing.address} /><button className={saved ? 'save saved' : 'save'} onClick={() => setSaved(!saved)} aria-label="Save listing">{saved ? '♥' : '♡'}</button>{listing.featured && <span className="tag">Featured</span>}</div>
    <div className="card-body"><div className="price-row"><h3>{listing.price}</h3><span>{listing.type}</span></div><p className="facts"><b>{listing.beds}</b> bd <b>{listing.baths}</b> ba <b>{listing.sqft}</b> sqft</p><p className="address">{listing.address}, {listing.city}</p><p className="meta">Listed on PropertyAdviser</p></div>
  </article>;
}

function App() {
  const [mode, setMode] = useState('Buy');
  const featured = useMemo(() => listings.filter(x => x.featured), []);
  return <>
    <header className="header"><div className="container nav"><a className="brand" href="#top">Property<span>Adviser</span><small>.com</small></a><nav><a href="#buy">Buy</a><a href="#rent">Rent</a><a href="#sell">Sell</a><a href="#mortgage">Mortgage</a><a href="#resources">Resources</a></nav><div className="nav-actions"><button className="link-btn">Sign in</button><button className="outline-btn">List a property</button></div></div></header>
    <main id="top">
      <section className="hero"><div className="hero-bg"></div><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow">REAL ESTATE, MADE SIMPLE</span><h1>Find a place that feels like <em>home.</em></h1><p>Explore homes, apartments and investment properties across the United States.</p></div><SearchBar mode={mode} setMode={setMode} /></div></section>
      <section className="trust"><div className="container trust-row"><span>Trusted by home seekers across the U.S.</span><div><b>1.2M+</b><small>Listings discovered</small></div><div><b>48</b><small>States covered</small></div><div><b>98%</b><small>Search satisfaction</small></div></div></section>
      <section className="section" id="buy"><div className="container"><div className="section-heading"><div><span className="eyebrow">CURATED FOR YOU</span><h2>Featured homes</h2><p>Standout properties worth a closer look.</p></div><a href="#all">View all listings <span>→</span></a></div><div className="grid">{featured.map(listing => <ListingCard key={listing.id} listing={listing} />)}</div></div></section>
      <section className="section light" id="rent"><div className="container"><div className="section-heading"><div><span className="eyebrow">EXPLORE MARKETS</span><h2>Popular places to live</h2><p>Start your next search in a city people love.</p></div></div><div className="city-grid">{['Austin, TX','Miami, FL','New York, NY','Los Angeles, CA','Denver, CO','Nashville, TN'].map((city, i) => <a href="#search" className="city" key={city}><img src={listings[i % listings.length].image} alt={city}/><div><strong>{city}</strong><span>Explore homes →</span></div></a>)}</div></div></section>
      <section className="cta" id="sell"><div className="container cta-inner"><div><span className="eyebrow">SELL WITH CONFIDENCE</span><h2>Thinking about selling?</h2><p>Understand your local market, reach qualified buyers and get more from your next move.</p></div><button>Get a home value estimate <span>→</span></button></div></section>
      <section className="section" id="resources"><div className="container resource-grid"><div><span className="eyebrow">PROPERTYADVISER GUIDES</span><h2>Make the next move with confidence.</h2><p>Practical insights for buying, renting, selling and investing in real estate.</p></div><div className="resource-list"><a href="#mortgage"><span>01</span><div><strong>First-time buyer guide</strong><p>What to know before you make an offer.</p></div><b>→</b></a><a href="#mortgage"><span>02</span><div><strong>Mortgage basics</strong><p>Understand rates, payments and affordability.</p></div><b>→</b></a><a href="#invest"><span>03</span><div><strong>Investing in property</strong><p>Compare markets and build a smarter strategy.</p></div><b>→</b></a></div></div></section>
    </main>
    <footer><div className="container footer-grid"><div><a className="brand" href="#top">Property<span>Adviser</span><small>.com</small></a><p>Your guide to real estate across America.</p></div><div><strong>Explore</strong><a>Buy</a><a>Rent</a><a>Sell</a><a>Mortgage</a></div><div><strong>Company</strong><a>About</a><a>How it works</a><a>Contact</a><a>Privacy</a></div><div><strong>Stay informed</strong><p>Market insights and useful property tips.</p><div className="subscribe"><input placeholder="Email address"/><button>→</button></div></div></div><div className="container copyright"><span>© 2026 PropertyAdviser.com. Demo project.</span><span>Built for the U.S. market.</span></div></footer>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
