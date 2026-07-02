import React, { useState } from 'react';
import { 
  Plus, CheckCircle, Clock, AlertTriangle, Coins, Building, 
  MapPin, Eye, UploadCloud, Info, AlertOctagon, HelpCircle 
} from 'lucide-react';

interface CaretakerWebProps {
  apiState: any;
  onRefresh: () => void;
  currentUser: any;
  token: string | null;
  theme?: 'light' | 'dark';
}

export default function CaretakerWeb({ 
  apiState, 
  onRefresh, 
  currentUser, 
  token,
  theme = 'light'
}: CaretakerWebProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'HOME' | 'UPLOAD_PROP' | 'PLACEMENTS' | 'ALERTS'>('HOME');
  
  // Property Form Inputs
  const [zone, setZone] = useState<'Gidan Kwano' | 'Jatapi' | 'Dama' | 'Gidan Managoro' | 'Other'>('Gidan Kwano');
  const [streetLandmark, setStreetLandmark] = useState('');
  const [propertyType, setPropertyType] = useState<'Self-contain' | 'Room & Parlour' | 'Mini Flat' | 'Shared Room' | 'Studio'>('Self-contain');
  const [bedrooms, setBedrooms] = useState(1);
  const [bathroomType, setBathroomType] = useState<'Flush' | 'Squatting' | 'Shared Flush' | 'Shared Squatting'>('Flush');
  const [hasKitchen, setHasKitchen] = useState(true);
  const [waterSource, setWaterSource] = useState<'Borehole' | 'Well' | 'Public' | 'Tanker'>('Borehole');
  const [distanceToCampus, setDistanceToCampus] = useState('5-minute walk');
  const [landlordRent, setLandlordRent] = useState(150000);
  const [leaseExpiry, setLeaseExpiry] = useState('2027-06-22');
  const [mapLocation, setMapLocation] = useState('');
  
  // Image URL Simulator arrays
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=600',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=600'
  ]);

  // Form error notification
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Auto-calculated connection fee and totals (reactive to landlordRent input)
  const connectionFee = Math.max(landlordRent * 0.08, 12000.0);
  const totalListedPrice = landlordRent + connectionFee;

  // Filter listings hosted by current caretaker (contact LLC-001)
  const hostedProperties = (apiState.properties || []).filter((p: any) => p.caretaker_id === 'LLC-001');
  const liveCount = hostedProperties.filter((p: any) => p.availability === 'Available').length;
  const takenCount = hostedProperties.filter((p: any) => p.availability === 'Taken').length;
  const pendingCount = hostedProperties.filter((p: any) => p.availability === 'Under Verification').length;

  const handleCreatePropertySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!streetLandmark) {
      setErrorMessage("Please supply a valid landmark for student routing audits.");
      return;
    }

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caretaker_id: 'LLC-001', // Static sandbox caretaker credentials
          zone,
          street_landmark: streetLandmark,
          property_type: propertyType,
          bedrooms,
          bathroom_type: bathroomType,
          has_kitchen: hasKitchen,
          water_source: waterSource,
          distance_to_campus: distanceToCampus,
          landlord_rent: landlordRent,
          lease_expiry_estimate: leaseExpiry ? new Date(leaseExpiry).toISOString() : undefined,
          map_location: mapLocation || undefined,
          photos
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed listing validation checks");
      } else {
        setSuccessMessage(`Success! Lodge property listed under ID ${data.property?.property_id || 'MOCK'}. A physical inspector has been assigned!`);
        onRefresh();
        
        // Reset state & redirect
        setStreetLandmark('');
        setMapLocation('');
        setLandlordRent(160000);
        setTimeout(() => {
          setActiveTab('HOME');
          setSuccessMessage('');
        }, 1200);
      }
    } catch (err) {
      setErrorMessage("Network interface timeout dispatching upload listing.");
    }
  };

  const handleSimulateRenewalPing = async (pingId: string, choice: 'Available' | 'Not Available') => {
    try {
      const res = await fetch(`/api/caretaker/renewal-alerts/${pingId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: choice })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error logging reactive ping response.");
    }
  };

  return (
    <div className={`flex-grow border rounded-2xl p-6 shadow-xs flex flex-col font-sans transition-all duration-300 min-h-[500px] ${
      isDark ? 'bg-[#242423] border-[#383837]/80 text-[#E2E1DA]' : 'bg-[#FCFBF8] border-[#C5C4BA]/80 text-[#1A1A1A]'
    }`}>
      
      {/* Upper header */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5 mb-6 ${
        isDark ? 'border-[#383837]/60' : 'border-[#C5C4BA]/40'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`border font-mono text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
              isDark ? 'bg-[#2D2D2C] border-[#383837]/80 text-[#E2E1DA]' : 'bg-[#ECEAE2] border-[#D1D0C7] text-[#1A1A1A]'
            }`}>FUTMINNA PORTAL</span>
          </div>
          <h2 className={`text-xl font-extrabold tracking-tight mt-1 ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>Caretaker Control Panel</h2>
          <p className={`text-xs ${isDark ? 'text-[#A3A29B]' : 'text-[#5C5B54]'}`}>Manage direct listings, rent escrows, and lease renewal verifications.</p>
        </div>

        {/* Dashboard Navigation Buttons */}
        <div className={`flex gap-1 p-1 rounded-xl border self-stretch md:self-auto text-xs font-medium ${
          isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-[#ECEAE2]/60 border-[#C5C4BA]'
        }`}>
          <button 
            onClick={() => { setActiveTab('HOME'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'HOME' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA] hover:bg-[#2D2D2C]' : 'text-[#5C5B54] hover:text-[#1A1A1A] hover:bg-[#F5F4EE]')
            }`}
          >
            My Lodges
          </button>
          <button 
            onClick={() => { setActiveTab('UPLOAD_PROP'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
              activeTab === 'UPLOAD_PROP' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#111111] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA] hover:bg-[#2D2D2C]' : 'text-[#5C5B54] hover:text-[#1A1A1A] hover:bg-[#F5F4EE]')
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> List Lodge
          </button>
          <button 
            onClick={() => { setActiveTab('PLACEMENTS'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'PLACEMENTS' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#111111] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA] hover:bg-[#2D2D2C]' : 'text-[#5C5B54] hover:text-[#1A1A1A] hover:bg-[#F5F4EE]')
            }`}
          >
            Placements
          </button>
          <button 
            onClick={() => { setActiveTab('ALERTS'); setErrorMessage(''); setSuccessMessage(''); }}
            className={`relative flex-1 md:flex-none px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ALERTS' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#111111] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA] hover:bg-[#2D2D2C]' : 'text-[#5C5B54] hover:text-[#1A1A1A] hover:bg-[#F5F4EE]')
            }`}
          >
            Pings
            {(apiState.caretaker_renewal_pings || []).length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
        </div>
      </div>

      {/* ==================================== */}
      {/* A. DASHBOARD HOME STATS & REGISTER */}
      {/* ==================================== */}
      {activeTab === 'HOME' && (
        <div className="space-y-6">
          {/* Statistics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-50 border border-zinc-200/65 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 bg-zinc-200/50 rounded-lg text-zinc-700">
                <Building className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Total Hosted</span>
                <strong className="text-xl font-bold text-zinc-900">{hostedProperties.length}</strong>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/65 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 bg-emerald-50 rounded-lg text-emerald-700 border border-emerald-100">
                <CheckCircle className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Live & Active</span>
                <strong className="text-xl font-bold text-emerald-750">{liveCount}</strong>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/65 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 bg-amber-50 rounded-lg text-amber-700 border border-amber-100">
                <Clock className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Under Audit</span>
                <strong className="text-xl font-bold text-amber-700">{pendingCount}</strong>
              </div>
            </div>

            <div className="bg-zinc-50 border border-zinc-200/65 p-4 rounded-xl flex items-center gap-3">
              <div className="p-3 bg-zinc-200/50 rounded-lg text-zinc-500">
                <AlertTriangle className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block font-bold uppercase tracking-wider">Booked Out</span>
                <strong className="text-xl font-bold text-zinc-700">{takenCount}</strong>
              </div>
            </div>
          </div>

          {/* Guidelines on free service model */}
          <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Info className="w-4 h-4 text-zinc-500 shrink-0" /> Zero Landlord Friction Pricing Model
              </h4>
              <p className="text-xs text-zinc-500 leading-normal max-w-2xl">
                Lodga lists caretaker offerings 100% free. The student covers the Rent + our 8% verification/escrow fee. Your rent portion is safeguarded and auto-disbursed 48 hours post occupancy.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('UPLOAD_PROP')} 
              className="text-xs bg-zinc-900 hover:bg-zinc-800 text-white font-semibold py-2 px-4 rounded-lg shrink-0 transition cursor-pointer shadow-xs"
            >
              List new lodge now
            </button>
          </div>

          {/* Table list of listings */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-zinc-150 bg-zinc-50/50">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">My Listings Catalog Ledger (ID: LLC-001)</h3>
            </div>

            <div className="overflow-x-auto">
              {hostedProperties.length === 0 ? (
                <div className="p-10 text-center text-zinc-400">
                  <p className="text-xs leading-normal">You have not posted any lodges yet. Click 'List Lodge' to add FUTMINNA student listings.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50/50 text-zinc-500 uppercase tracking-wider border-b border-zinc-200 text-[10px] font-bold">
                    <tr>
                      <th className="px-5 py-3">Property ID</th>
                      <th className="px-5 py-3">Zone/Type</th>
                      <th className="px-5 py-3">Landmark/Address</th>
                      <th className="px-5 py-3">Landlord Rent</th>
                      <th className="px-5 py-3">Listing Price</th>
                      <th className="px-5 py-3 text-center">Catalog Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {hostedProperties.map((prop: any) => (
                      <tr key={prop.property_id} className="hover:bg-zinc-50/40 transition">
                        <td className="px-5 py-3.5 font-mono font-semibold text-zinc-500">{prop.property_id}</td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-zinc-900 block">{prop.property_type}</span>
                          <span className="text-[10px] text-zinc-400 block font-medium">{prop.zone}</span>
                        </td>
                        <td className="px-5 py-3.5 max-w-[200px] truncate text-zinc-600" title={prop.street_landmark}>
                          {prop.street_landmark}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-900 font-mono font-medium">₦{Number(prop.landlord_rent).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-zinc-900 font-mono font-bold">₦{Number(prop.total_listed_price).toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border-xs ${
                            prop.availability === 'Available' ? 'bg-emerald-50 border-emerald-250 text-emerald-700' :
                            prop.availability === 'Taken' ? 'bg-zinc-100 border-zinc-250 text-zinc-700' :
                            'bg-amber-50 border-amber-250 text-amber-700'
                          }`}>
                            {prop.availability}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* B. PROPERTY LISTING UPLOAD FORM */}
      {/* ==================================== */}
      {activeTab === 'UPLOAD_PROP' && (
        <form onSubmit={handleCreatePropertySubmit} className="space-y-6">
          <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-zinc-500" /> Auto Pricing Calculations
              </h4>
              <p className="text-xs text-zinc-500 leading-normal max-w-xl">
                Lodga appends an robust 8% connecting fee (minimum ₦12,000 floor rate) to ensure escrow security. See real values directly:
              </p>
            </div>

            <div className="flex gap-4 items-center bg-white px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-650">
              <div className="text-right">
                <span className="block text-[9px] text-zinc-400 uppercase font-bold">You receive:</span>
                <strong className="text-zinc-900 font-mono text-sm font-semibold">₦{landlordRent.toLocaleString()}</strong>
              </div>
              <div className="text-right border-l border-zinc-150 pl-4">
                <span className="block text-[9px] text-zinc-400 uppercase font-bold">Catalog Price:</span>
                <strong className="text-zinc-900 font-mono text-sm font-bold">₦{totalListedPrice.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-700">
              ⚠️ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="bg-emerald-50 border border-emerald-250 p-3 rounded-xl text-xs text-emerald-800 font-medium">
              ✓ {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Input Rent */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">My Desired Rent (₦ / Year)</label>
              <input 
                type="number"
                value={landlordRent}
                min={20000}
                onChange={(e) => setLandlordRent(Number(e.target.value))}
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/40 rounded-xl px-4 py-3 text-sm text-zinc-800 outline-none transition"
                required
              />
            </div>

            {/* Zone Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">FUTMINNA Student Zone Area</label>
              <select 
                value={zone} 
                onChange={(e) => setZone(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/40 rounded-xl px-4 py-3 text-sm text-zinc-700 outline-none transition"
              >
                <option value="Gidan Kwano">Gidan Kwano (Campus Frontage)</option>
                <option value="Jatapi">Jatapi</option>
                <option value="Dama">Dama Zone</option>
                <option value="Gidan Managoro">Gidan Managoro</option>
                <option value="Other">Other Surrounding</option>
              </select>
            </div>

            {/* Street Landmarks */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Street Landmarks & Directions</label>
              <input 
                type="text" 
                value={streetLandmark}
                onChange={(e) => setStreetLandmark(e.target.value)}
                placeholder="e.g. Opposite Divine Mercy Catholic Church, 2nd Turning Gidan Kwano"
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-800 outline-none transition"
                required
              />
            </div>

            {/* Map Location (Optional) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">GPS Map Location Pin / Coordinates (Optional)</label>
              <input 
                type="text" 
                value={mapLocation}
                onChange={(e) => setMapLocation(e.target.value)}
                placeholder="e.g. 9.5168, 6.4485 or Google Maps embed pin URL"
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-800 outline-none transition"
              />
              <span className="text-[10px] text-zinc-400 block mt-1">Provide exact coordinates so students can locate your property on the local zone map instantly.</span>
            </div>

            {/* Property Style */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Property Layout Type</label>
              <select 
                value={propertyType} 
                onChange={(e) => setPropertyType(e.target.value as any)}
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-700 outline-none transition"
              >
                <option value="Self-contain">Single Self-Contain Apartment</option>
                <option value="Room & Parlour">Room & Parlour Flat</option>
                <option value="Mini Flat">Mini Flat (1 Bed + Parlour)</option>
                <option value="Shared Room">Shared Hostels Room</option>
                <option value="Studio">Studio Space</option>
              </select>
            </div>

            {/* Distance descriptions */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Distance to Campus Gate</label>
              <input 
                type="text" 
                value={distanceToCampus}
                onChange={(e) => setDistanceToCampus(e.target.value)}
                placeholder="e.g. 5-minute walk, or 3-minute bike ride"
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-800 outline-none transition"
                required
              />
            </div>

            {/* Water Source & bedrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Bedrooms count</label>
                <input 
                  type="number" 
                  value={bedrooms}
                  min={1}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2.5 text-sm text-zinc-800 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Has Separated Kitchen?</label>
                <select 
                  value={hasKitchen ? 'yes' : 'no'} 
                  onChange={(e) => setHasKitchen(e.target.value === 'yes')}
                  className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition"
                >
                  <option value="yes">Yes, Separate</option>
                  <option value="no">No</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Toilet design style</label>
                <select 
                  value={bathroomType} 
                  onChange={(e) => setBathroomType(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition"
                >
                  <option value="Flush">Private Flush Toilet</option>
                  <option value="Squatting">Private Squatting Toilet</option>
                  <option value="Shared Flush">Shared Flush Toilet</option>
                  <option value="Shared Squatting">Shared Squatting Toilet</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Water infrastructure</label>
                <select 
                  value={waterSource} 
                  onChange={(e) => setWaterSource(e.target.value as any)}
                  className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-3 py-2.5 text-sm text-zinc-700 outline-none transition"
                >
                  <option value="Borehole">Borehole Pumping</option>
                  <option value="Well">Well Water</option>
                  <option value="Public">Public Tap Supply</option>
                  <option value="Tanker">Tanker Refill system</option>
                </select>
              </div>
            </div>
            
            {/* Lease Estimate */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Estimated Lease Expiry / Expiration sweep</label>
              <input 
                type="date"
                value={leaseExpiry}
                onChange={(e) => setLeaseExpiry(e.target.value)}
                className="w-full bg-white border border-zinc-200 focus:border-zinc-900 rounded-xl px-4 py-3 text-sm text-zinc-800 outline-none transition"
              />
            </div>

            {/* Photo upload proof banner */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">Verification photos gallery</label>
              <div className="bg-zinc-50 border border-dashed border-zinc-200 p-4 rounded-xl text-center space-y-1.5">
                <UploadCloud className="w-8 h-8 text-zinc-400 mx-auto" />
                <span className="block text-[11px] text-zinc-500 font-medium">8 default room images are prepared.</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-block font-bold">✓ Ready for Verification Check (8 / 8)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-150 pt-5 flex justify-end gap-3">
            <button 
              type="button" 
              onClick={() => setActiveTab('HOME')}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-zinc-600 transition cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="bg-zinc-900 hover:bg-zinc-850 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition cursor-pointer shadow-xs"
            >
              Publish Listing For Inspection Audits
            </button>
          </div>
        </form>
      )}

      {/* ==================================== */}
      {/* C. TENANTS PLACEMENT TRANSACTIONS */}
      {/* ==================================== */}
      {activeTab === 'PLACEMENTS' && (
        <div className="space-y-4">
          <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-700 mb-1">Split Payout & Safely Escrow Protocol</h4>
            <p className="text-[11px] text-zinc-500 leading-normal">
              When students pay, funds are logged as "Held". 48 hours post student checking-in, the landlord portion is automatically released to your registered account, unless a physical dispute is filed.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              {(apiState.transactions || []).length === 0 ? (
                <div className="p-8 text-center text-zinc-400">
                  <p className="text-xs">No tenant bookings found in live Lodga registries.</p>
                </div>
              ) : (
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50/50 text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-200 font-bold">
                    <tr>
                      <th className="px-5 py-3">Receipt code</th>
                      <th className="px-5 py-3">Property ID</th>
                      <th className="px-5 py-3">Rent portion</th>
                      <th className="px-5 py-3">Tenant Details</th>
                      <th className="px-5 py-3">Target Move-In</th>
                      <th className="px-5 py-3">Escrow clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150">
                    {(apiState.transactions || []).map((t: any) => (
                      <tr key={t.transaction_id} className="hover:bg-zinc-50/40 transition">
                        <td className="px-5 py-4 font-mono font-semibold text-zinc-400">{t.transaction_id}</td>
                        <td className="px-5 py-4 font-bold text-zinc-800">{t.property_id}</td>
                        <td className="px-5 py-4 font-mono font-semibold text-zinc-900">₦{Number(t.landlord_rent).toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className="block text-zinc-700 font-medium">Sodiq Adesanya</span>
                          <span className="block text-[10px] text-zinc-400">08123456789</span>
                        </td>
                        <td className="px-5 py-4 text-zinc-500 font-medium">{t.move_in_date}</td>
                        <td className="px-5 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold border-xs ${
                            t.escrow_status === 'Held' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' :
                            t.escrow_status === 'Released' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' :
                            'bg-red-50 text-red-700 border-red-150'
                          }`}>
                            {t.escrow_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* D. LEASE ALERTS & WHATSAPP PING ALERTS */}
      {/* ==================================== */}
      {activeTab === 'ALERTS' && (
        <div className="space-y-4">
          <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl text-xs space-y-1">
            <h4 className="font-bold text-zinc-950 flex items-center gap-1">
              <AlertOctagon className="w-4 h-4 text-zinc-500 shrink-0" /> WhatsApp Renewal Alerts Tracker
            </h4>
            <p className="text-zinc-500 text-[11px] leading-relaxed">
              Lodga dispatches automated notification reminders 21 days before any catalog lease expires. Please verify that this property is still available to incoming students.
            </p>
          </div>

          <div className="space-y-3">
            {(apiState.caretaker_renewal_pings || []).length === 0 ? (
              <div className="text-center py-10 bg-white border border-zinc-200 border-dashed rounded-xl text-zinc-400 text-xs">
                <span>No active lease alerts reported. Run a simulated daily sweep from the back-office sandbox desk.</span>
              </div>
            ) : (
              (apiState.caretaker_renewal_pings || []).map((ping: any) => (
                <div key={ping.ping_id} className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                  <div className="space-y-1.5">
                    <div className="flex gap-2 items-center">
                      <span className="font-mono text-xs font-bold text-zinc-400">{ping.ping_id}</span>
                      <span className="text-[10px] text-zinc-500 bg-zinc-200/50 px-2.5 py-0.5 rounded font-bold">Sent: {new Date(ping.ping_sent_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-zinc-700">
                      Verify lease availability status for property: <strong className="text-zinc-900 font-mono font-medium">{ping.property_id}</strong>
                    </p>
                    {ping.caretaker_response ? (
                      <div className="text-[11px] text-emerald-700 font-medium bg-emerald-50 inline-block px-2 py-0.5 rounded border border-emerald-100">
                        Submitted reply: <strong>{ping.caretaker_response}</strong>
                      </div>
                    ) : (
                      <span className="text-[10px] text-zinc-450 font-bold block">🚨 ACTION NEEDED: Caretaker response pending</span>
                    )}
                  </div>

                  {!ping.caretaker_response && (
                    <div className="flex gap-2 shrink-0 self-stretch md:self-auto text-xs font-bold">
                      <button 
                        onClick={() => handleSimulateRenewalPing(ping.ping_id, 'Available')}
                        className="flex-1 md:flex-none bg-zinc-950 hover:bg-zinc-850 text-white font-bold py-1.5 px-4 rounded-lg cursor-pointer"
                      >
                        Still Available
                      </button>
                      <button 
                        onClick={() => handleSimulateRenewalPing(ping.ping_id, 'Not Available')}
                        className="flex-1 md:flex-none bg-zinc-200 hover:bg-zinc-300 text-zinc-700 py-1.5 px-4 rounded-lg cursor-pointer"
                      >
                        Taken / Booked
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
}
