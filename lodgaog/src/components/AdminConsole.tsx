import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Settings, ShieldCheck, Play, RefreshCw, Layers, Database, 
  MapPin, Check, X, FileText, ChevronRight, UserPlus, Trash2, BarChart3, TrendingUp,
  UploadCloud, Plus, Terminal, Activity, Clock, SlidersHorizontal, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { APIProvider, Map as GMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { getTrackedEvents } from '../lib/analytics';
import { jsPDF } from 'jspdf';

const GOOGLE_MAPS_API_KEY = 
  process.env.GOOGLE_MAPS_PLATFORM_KEY || 
  process.env.VITE_GOOGLE_MAPS_API_KEY || 
  '';

interface AdminConsoleProps {
  apiState: any;
  onRefresh: () => void;
  token: string | null;
  theme?: 'light' | 'dark';
}

export default function AdminConsole({ 
  apiState, 
  onRefresh, 
  token,
  theme = 'light'
}: AdminConsoleProps) {
  const isDark = theme === 'dark';
  const [activeTab, setActiveTab] = useState<'VERIFICATIONS' | 'LEDGER' | 'DB_CONSOLE' | 'ANALYTICS' | 'REPORTS'>('VERIFICATIONS');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('PROP-103');

  // Analytics logs state & dynamic polling
  const [analyticsLogs, setAnalyticsLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState<string>('ALL');

  useEffect(() => {
    // Populate immediately
    setAnalyticsLogs([...getTrackedEvents()]);

    const interval = setInterval(() => {
      setAnalyticsLogs([...getTrackedEvents()]);
    }, 1200);

    return () => clearInterval(interval);
  }, []);
  
  // 8-Point Audit form checklist inputs
  const [chk1, setChk1] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk2, setChk2] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk3, setChk3] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk4, setChk4] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk5, setChk5] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk6, setChk6] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk7, setChk7] = useState<'Pass' | 'Fail' | 'Pending'>('Pass');
  const [chk8, setChk8] = useState<'Pass' | 'Fail' | 'Pending'>('Pending');
  const [auditNotes, setAuditNotes] = useState('Inspectors physical visit confirmed all dimensions & borehole yields correspond.');

  // Map coordinates pinning states
  const [pinnedLat, setPinnedLat] = useState<number | null>(null);
  const [pinnedLng, setPinnedLng] = useState<number | null>(null);
  const [pinningMessage, setPinningMessage] = useState('');

  const [message, setMessage] = useState('');

  // Customer Reports state variables & handlers
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string>('Pending');
  const [updatingNotes, setUpdatingNotes] = useState<string>('');

  const fetchReports = async () => {
    if (!token) return;
    setLoadingReports(true);
    try {
      const res = await fetch('/api/admin/reports', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReportsList(data);
      }
    } catch (err) {
      console.error('Error fetching admin reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: string, notes: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status, admin_notes: notes })
      });
      if (res.ok) {
        alert("Report status updated successfully!");
        setUpdatingReportId(null);
        fetchReports();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update report status.");
      }
    } catch (err) {
      alert("Error updating report status.");
    }
  };

  useEffect(() => {
    if (activeTab === 'REPORTS' && token) {
      fetchReports();
    }
  }, [activeTab, token]);

  const selectedProperty = (apiState.properties || []).find((p: any) => p.property_id === selectedPropertyId);

  // Sync inputs when selectedProperty or apiState property details change
  useEffect(() => {
    if (selectedProperty) {
      const v = selectedProperty.verification_check || {};
      setChk1(v.item_1_physical_visit || 'Pending');
      setChk2(v.item_2_photos || 'Pending');
      setChk3(v.item_3_id_verified || 'Pending');
      setChk4(v.item_4_ownership || 'Pending');
      setChk5(v.item_5_pricing || 'Pending');
      setChk6(v.item_6_amenities || 'Pending');
      setChk7(v.item_7_feedback || 'Pending');
      setChk8(v.item_8_location_pinned || 'Pending');
      setAuditNotes(v.notes || 'Inspectors physical visit confirmed all dimensions & borehole yields correspond.');
      
      // Also sync coordinates for map
      setPinnedLat(selectedProperty.latitude ? Number(selectedProperty.latitude) : null);
      setPinnedLng(selectedProperty.longitude ? Number(selectedProperty.longitude) : null);
      setPinningMessage('');
    }
  }, [selectedPropertyId, apiState.properties]);

  // Admin Create Property states
  const [isAddingProperty, setIsAddingProperty] = useState(false);
  const [adminZone, setAdminZone] = useState<'Gidan Kwano' | 'Jatapi' | 'Dama' | 'Gidan Managoro' | 'Other'>('Gidan Kwano');
  const [adminStreetLandmark, setAdminStreetLandmark] = useState('');
  const [adminPropertyType, setAdminPropertyType] = useState<'Self-contain' | 'Room & Parlour' | 'Mini Flat' | 'Shared Room' | 'Studio'>('Self-contain');
  const [adminCaretakerId, setAdminCaretakerId] = useState('');
  const [adminBedrooms, setAdminBedrooms] = useState(1);
  const [adminBathroomType, setAdminBathroomType] = useState<'Flush' | 'Squatting' | 'Shared Flush' | 'Shared Squatting'>('Flush');
  const [adminHasKitchen, setAdminHasKitchen] = useState(true);
  const [adminWaterSource, setAdminWaterSource] = useState<'Borehole' | 'Well' | 'Public' | 'Tanker'>('Borehole');
  const [adminDistanceToCampus, setAdminDistanceToCampus] = useState('');
  const [adminLandlordRent, setAdminLandlordRent] = useState(150000);
  const [adminLeaseExpiry, setAdminLeaseExpiry] = useState('2027-06-22');
  const [adminMapLocation, setAdminMapLocation] = useState('');
  const [adminAcceptsHalfSession, setAdminAcceptsHalfSession] = useState(false);

  const handleAdminCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!token) {
      alert("Sign in first to authorize listing creation.");
      return;
    }

    if (!adminCaretakerId) {
      alert("Please select a caretaker/contact.");
      return;
    }

    try {
      const res = await fetch('/api/admin/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          zone: adminZone,
          street_landmark: adminStreetLandmark,
          property_type: adminPropertyType,
          caretaker_id: adminCaretakerId,
          bedrooms: Number(adminBedrooms),
          bathroom_type: adminBathroomType,
          has_kitchen: adminHasKitchen,
          water_source: adminWaterSource,
          distance_to_campus: adminDistanceToCampus,
          landlord_rent: Number(adminLandlordRent),
          lease_expiry_estimate: adminLeaseExpiry ? new Date(adminLeaseExpiry).toISOString() : undefined,
          map_location: adminMapLocation || undefined,
          accepts_half_session: adminAcceptsHalfSession
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Property uploaded successfully!");
        onRefresh();
        setIsAddingProperty(false);
        // Clear inputs
        setAdminStreetLandmark('');
        setAdminDistanceToCampus('');
        setAdminMapLocation('');
      } else {
        alert(data.error || "Failed to upload property listing.");
      }
    } catch (err) {
      alert("Gateway connection failure.");
    }
  };

  // Contacts inputs
  const [pubName, setPubName] = useState('');
  const [pubPhone, setPubPhone] = useState('');
  const [pubZone, setPubZone] = useState('Gidan Kwano');
  const [pubType, setPubType] = useState<'Landlord' | 'Caretaker' | 'Agent'>('Caretaker');

  const propertiesList = apiState.properties || [];
  const transactionsList = apiState.transactions || [];

  const zoneCounts = propertiesList.reduce((acc: any, p: any) => {
    acc[p.zone] = (acc[p.zone] || 0) + 1;
    return acc;
  }, {});
  
  const zoneChartData = ['Gidan Kwano', 'Jatapi', 'Dama', 'Gidan Managoro', 'Other'].map(z => ({
    name: z,
    Count: zoneCounts[z] || 0,
  }));

  const escrowCounts = transactionsList.reduce((acc: any, t: any) => {
    acc[t.escrow_status] = (acc[t.escrow_status] || 0) + 1;
    return acc;
  }, {});

  const escrowChartData = [
    { name: 'Locked (Held)', value: escrowCounts['Held'] || 0, color: '#3B82F6' },
    { name: 'Released', value: escrowCounts['Released'] || 0, color: '#10B981' },
    { name: 'Refunded', value: escrowCounts['Refunded'] || 0, color: '#6B7280' },
    { name: 'Disputed', value: escrowCounts['Disputed'] || 0, color: '#EF4444' },
  ];

  const averageRentByZone = ['Gidan Kwano', 'Jatapi', 'Dama', 'Gidan Managoro'].map(z => {
    const zoneProps = propertiesList.filter((p: any) => p.zone === z);
    const avgRent = zoneProps.length > 0 
      ? Math.round(zoneProps.reduce((sum: number, p: any) => sum + Number(p.landlord_rent || 0), 0) / zoneProps.length)
      : 0;
    const avgFee = zoneProps.length > 0
      ? Math.round(zoneProps.reduce((sum: number, p: any) => sum + Number(p.connection_fee || 0), 0) / zoneProps.length)
      : 0;
    return {
      zone: z,
      'Avg Rent': avgRent,
      'Avg Connection Fee': avgFee
    };
  });

  const generatePDFTitleAndHeader = (doc: jsPDF, title: string) => {
    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, 210, 35, 'F');
    
    doc.setTextColor(226, 225, 218);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text("LODGA HOUSING TRUST PORTAL - ADMIN AUDIT", 15, 15);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`CONFIDENTIALITY STATE: SECURE AUDIT LEDGER`, 15, 22);
    doc.text(`TIMESTAMP GENERATED: ${new Date().toLocaleString()} (UTC)`, 15, 27);
    
    doc.setTextColor(26, 26, 26);
  };

  const downloadAnalyticsPDF = () => {
    const doc = new jsPDF();
    generatePDFTitleAndHeader(doc, "PLATFORM PERFORMANCE & ANALYTICS AUDIT REPORT");
    
    let y = 45;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. EXECUTIVE PERFORMANCE SUMMARY METRICS", 15, y);
    y += 8;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    
    const totalListings = propertiesList?.length || 0;
    const fundsEscrow = transactionsList?.filter((t: any) => t.escrow_status === 'Held').reduce((sum: number, t: any) => sum + Number(t.total_price || 0), 0) || 0;
    const settledPayouts = transactionsList?.filter((t: any) => t.escrow_status === 'Released').reduce((sum: number, t: any) => sum + Number(t.landlord_rent || 0), 0) || 0;
    const activeDisputes = transactionsList?.filter((t: any) => t.escrow_status === 'Disputed').length || 0;
    const totalTransactions = transactionsList?.length || 0;
    const totalRevenue = transactionsList?.filter((t: any) => t.escrow_status === 'Released' || t.escrow_status === 'Held').reduce((sum: number, t: any) => sum + Number(t.connection_fee || 0), 0) || 0;
    const disputeRatio = totalTransactions > 0 ? ((activeDisputes / totalTransactions) * 100).toFixed(1) : "0.0";
    
    const metrics = [
      ["Total Lodging Listings Active", `${totalListings} Properties listed`],
      ["Total Financial Transactions Engaged", `${totalTransactions} Escrow bookings`],
      ["Calculated Platform Connection Revenue", `NGN ${Number(totalRevenue).toLocaleString()}`],
      ["Escrow Funds Locked (Active Bookings)", `NGN ${Number(fundsEscrow).toLocaleString()}`],
      ["Settled Landlord Payout Releases", `NGN ${Number(settledPayouts).toLocaleString()}`],
      ["Escrow Disputed Hold Volume", `${activeDisputes} Active Disputes (${disputeRatio}% Dispute Rate)`],
      ["Safety/Compliance Reports Lodged", `${reportsList?.length || 0} Incident Complaints`]
    ];
    
    metrics.forEach(([label, val]) => {
      doc.setFont("Helvetica", "bold");
      doc.text(`${label}:`, 15, y);
      doc.setFont("Helvetica", "normal");
      doc.text(val, 110, y);
      y += 6.5;
    });
    
    y += 6;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. GEOGRAPHIC DISTRIBUTION (BY STUDENT ZONE)", 15, y);
    y += 8;
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const zones = ["Gidan Kwano", "Jatapi", "Dama", "Gidan Managoro", "Other"];
    zones.forEach(zone => {
      const count = (apiState.properties || []).filter((p: any) => p.zone === zone).length;
      doc.setFont("Helvetica", "bold");
      doc.text(`- ${zone}:`, 18, y);
      doc.setFont("Helvetica", "normal");
      doc.text(`${count} Listed Lodges`, 70, y);
      y += 6;
    });
    
    y += 6;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. ESCROW DISBURSEMENT AND GUARANTEE FLOW", 15, y);
    y += 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    const statuses = ['Held', 'Released', 'Disputed', 'Refunded'];
    statuses.forEach(status => {
      const count = (apiState.transactions || []).filter((t: any) => t.escrow_status === status).length;
      doc.setFont("Helvetica", "bold");
      doc.text(`- Status "${status}":`, 18, y);
      doc.setFont("Helvetica", "normal");
      doc.text(`${count} Transactions`, 70, y);
      y += 6;
    });

    if (analyticsLogs.length > 0) {
      doc.addPage();
      generatePDFTitleAndHeader(doc, "PLATFORM PERFORMANCE & ANALYTICS AUDIT REPORT");
      let y2 = 45;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(12);
      doc.text("4. USER INTERACTION AUDIT LOG SUMMARY (LAST 15 EVENTS)", 15, y2);
      y2 += 8;
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      
      const lastLogs = analyticsLogs.slice(-15).reverse();
      lastLogs.forEach((log: any, idx: number) => {
        if (y2 > 275) {
          doc.addPage();
          y2 = 40;
        }
        const timeStr = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A';
        const evType = `[${log.event.toUpperCase()}]`;
        const desc = log.params ? JSON.stringify(log.params) : '';
        doc.setFont("Helvetica", "bold");
        doc.text(`${timeStr} ${evType}`, 15, y2);
        doc.setFont("Helvetica", "normal");
        const wrappedDesc = doc.splitTextToSize(desc, 120);
        doc.text(wrappedDesc, 75, y2);
        y2 += Math.max(6, wrappedDesc.length * 4.5);
      });
    }
    
    doc.save(`LODGA_Analytics_Report_${Date.now()}.pdf`);
  };

  const downloadDatabaseConsolePDF = () => {
    const doc = new jsPDF();
    generatePDFTitleAndHeader(doc, "DATABASE CONSOLE AUDIT LEDGER");
    
    let y = 45;
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("1. USERS DIRECTORY (ACCOUNTS)", 15, y);
    y += 8;
    
    doc.setFontSize(8.5);
    const users = apiState.users || [];
    if (users.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.text("No registered accounts in system state database.", 15, y);
      y += 8;
    } else {
      users.forEach((u: any) => {
        if (y > 275) { doc.addPage(); y = 40; }
        doc.setFont("Helvetica", "bold");
        doc.text(`[${u.role?.toUpperCase() || 'STUDENT'}] ID: ${u.user_id || u.email}`, 15, y);
        doc.setFont("Helvetica", "normal");
        doc.text(`Name: ${u.full_name || 'N/A'} | Email: ${u.email} | Phone: ${u.phone || 'N/A'}`, 15, y + 4.5);
        y += 11;
      });
    }
    
    y += 4;
    if (y > 260) { doc.addPage(); y = 40; }
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("2. LISTED HOUSING PROPERTIES DIRECTORY", 15, y);
    y += 8;
    
    doc.setFontSize(8.5);
    const properties = apiState.properties || [];
    if (properties.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.text("No property listings in system state database.", 15, y);
      y += 8;
    } else {
      properties.forEach((p: any) => {
        if (y > 275) { doc.addPage(); y = 40; }
        doc.setFont("Helvetica", "bold");
        doc.text(`Property ID: ${p.property_id} - ${p.property_type} (${p.bedrooms} Bed)`, 15, y);
        doc.setFont("Helvetica", "normal");
        doc.text(`Address: ${p.street_landmark}, ${p.zone} | Rent: NGN ${Number(p.landlord_rent).toLocaleString()}/year | Caretaker: ${p.caretaker_id || 'None'}`, 15, y + 4.5);
        y += 11;
      });
    }
    
    y += 4;
    if (y > 260) { doc.addPage(); y = 40; }
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text("3. TRUST ESCROW BOOKING TRANSACTIONS", 15, y);
    y += 8;
    
    doc.setFontSize(8.5);
    const transactions = apiState.transactions || [];
    if (transactions.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.text("No transactions registered in system state database.", 15, y);
      y += 8;
    } else {
      transactions.forEach((t: any) => {
        if (y > 275) { doc.addPage(); y = 40; }
        doc.setFont("Helvetica", "bold");
        doc.text(`Tx ID: ${t.transaction_id} [Status: ${t.escrow_status}]`, 15, y);
        doc.setFont("Helvetica", "normal");
        doc.text(`Lodge: ${t.property_id} | Student: ${t.student_id} | Price: NGN ${Number(t.total_price).toLocaleString()} | Move-In Date: ${t.move_in_date || 'N/A'}`, 15, y + 4.5);
        y += 11;
      });
    }

    doc.save(`LODGA_Database_Ledger_${Date.now()}.pdf`);
  };

  const downloadCustomerReportsPDF = () => {
    const doc = new jsPDF();
    generatePDFTitleAndHeader(doc, "CUSTOMER SAFETY & COMPLIANCE REPORTS LEDGER");
    
    let y = 45;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`ALL REGISTERED SECURITY ESCALATIONS (${reportsList.length} total)`, 15, y);
    y += 8;
    
    if (reportsList.length === 0) {
      doc.setFont("Helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Zero safety, caretaker suspicious activity, or fraud reports lodged.", 15, y);
    } else {
      reportsList.forEach((r: any, idx: number) => {
        if (y > 230) {
          doc.addPage();
          y = 40;
        }
        doc.setDrawColor(200, 200, 200);
        doc.line(15, y, 195, y);
        y += 6;
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`Incident ${idx + 1} - Report ID: ${r.report_id} [${r.status?.toUpperCase() || 'PENDING'}]`, 15, y);
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(`Created: ${r.created_at ? new Date(r.created_at).toLocaleString() : 'N/A'} | Type: ${r.report_type}`, 115, y);
        y += 6;
        
        doc.setFont("Helvetica", "bold");
        doc.text("Reporter:", 15, y);
        doc.setFont("Helvetica", "normal");
        const reporterInfo = r.reporter ? `${r.reporter.full_name} (${r.reporter.email} • ${r.reporter.phone || 'No phone'})` : 'Anonymous';
        doc.text(reporterInfo, 35, y);
        y += 5.5;
        
        doc.setFont("Helvetica", "bold");
        doc.text("Subject Party:", 15, y);
        doc.setFont("Helvetica", "normal");
        const subjectInfo = r.subjectContact ? `${r.subjectContact.full_name} (${r.subjectContact.contact_type} • Zone: ${r.subjectContact.zone} • Phone: ${r.subjectContact.phone})` : 'None / Noted in description';
        doc.text(subjectInfo, 35, y);
        y += 5.5;
        
        if (r.subjectProperty) {
          doc.setFont("Helvetica", "bold");
          doc.text("Lodge In Question:", 15, y);
          doc.setFont("Helvetica", "normal");
          doc.text(`ID: ${r.subjectProperty.property_id} | Type: ${r.subjectProperty.property_type} | Address: ${r.subjectProperty.street_landmark}`, 45, y);
          y += 5.5;
        }
        
        doc.setFont("Helvetica", "bold");
        doc.text("Description:", 15, y);
        doc.setFont("Helvetica", "normal");
        const wrappedDesc = doc.splitTextToSize(r.description || "No description provided.", 155);
        doc.text(wrappedDesc, 35, y);
        y += wrappedDesc.length * 4.5 + 2;
        
        if (r.admin_notes) {
          doc.setFont("Helvetica", "bold");
          doc.text("Admin Notes:", 15, y);
          doc.setFont("Helvetica", "italic");
          const wrappedNotes = doc.splitTextToSize(r.admin_notes, 155);
          doc.text(wrappedNotes, 35, y);
          y += wrappedNotes.length * 4.5 + 2;
        }
        y += 4;
      });
    }
    
    doc.save(`LODGA_Customer_Safety_Reports_${Date.now()}.pdf`);
  };

  const downloadTelemetryJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(analyticsLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lodga_user_telemetry_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleApply7Checklist = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    if (!token) {
      alert("Sign in first via student authentication simulator to lock admin session session-token.");
      return;
    }

    try {
      const res = await fetch(`/api/admin/properties/${selectedPropertyId}/verify`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          item_1_physical_visit: chk1,
          item_2_photos: chk2,
          item_3_id_verified: chk3,
          item_4_ownership: chk4,
          item_5_pricing: chk5,
          item_6_amenities: chk6,
          item_7_feedback: chk7,
          item_8_location_pinned: chk8,
          notes: auditNotes
        })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        onRefresh();
      } else {
        setMessage(data.error || "Inspection update failure.");
      }
    } catch (err) {
      setMessage("Gateway connection failure.");
    }
  };

  const handleUpdateAvailability = async (propertyId: string, availability: string) => {
    try {
      const res = await fetch(`/api/admin/properties/${propertyId}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onRefresh();
      } else {
        alert(`GATE TRANSITION ERROR: ${data.error}`);
      }
    } catch (err) {
      alert("Verification server error.");
    }
  };

  const handleCustomCronRenewals = async () => {
    try {
      const res = await fetch('/api/simulator/cron/renewals', { method: 'POST' });
      const data = await res.json();
      alert(`Automated Lease Renewal sweep complete. WhatsApp triggers calculated.\nAlerts sent: ${data.pingsCount}`);
      onRefresh();
    } catch (err) {
      alert("Cron execution failure.");
    }
  };

  const handleCustomCronPayouts = async () => {
    try {
      const res = await fetch('/api/simulator/cron/escrow', { method: 'POST' });
      const data = await res.json();
      alert(`Automated 48h Move-In release trigger complete.\nDisbursed rentals: ${data.releasedCount}`);
      onRefresh();
    } catch (err) {
      alert("Cron settlement failure.");
    }
  };

  const handleEscrowPayoutAction = async (transactionId: string, action: 'release' | 'refund') => {
    try {
      const res = await fetch(`/api/admin/transactions/${transactionId}/escrow`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        onRefresh();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Payment processing interaction error.");
    }
  };

  const handleCreateContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pubName || !pubPhone) return;

    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: pubName,
          phone: pubPhone,
          whatsapp: '234' + pubPhone.slice(1),
          zone: pubZone,
          contact_type: pubType
        })
      });
      if (res.ok) {
        setPubName('');
        setPubPhone('');
        onRefresh();
        alert("Directory participant registered!");
      } else {
        const errorData = await res.json();
        alert(errorData.error);
      }
    } catch (err) {
      alert("Contacts system error.");
    }
  };

  const handleResetDatabase = async () => {
    if (confirm("Reset current simulator context to pure default seeds?")) {
      await fetch('/api/simulator/db/reset', { method: 'POST' });
      onRefresh();
      alert("Database reset executed cleanly. Original seeds restored.");
    }
  };

  return (
    <div className={`rounded-2xl p-6 border transition-all duration-300 ${isDark ? 'bg-[#242423] border-[#383837]/80 text-[#E2E1DA]' : 'bg-[#FCFBF8] border-[#C5C4BA]/80 text-[#1A1A1A]'} mt-6 font-sans shadow-xs`}>
      
      {/* Upper Panel Tab Selectors */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 mb-4 gap-3 ${isDark ? 'border-[#383837]/60' : 'border-[#C5C4BA]/40'}`}>
        <div className="flex items-center gap-2">
          <ShieldAlert className={`${isDark ? 'text-[#E2E1DA]/80' : 'text-[#1A1A1A]/80'} w-5 h-5 shrink-0`} />
          <div>
            <h3 className={`font-extrabold text-sm ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>Lodga HQ Internal Inspector Console</h3>
            <p className={`text-[10px] font-medium ${isDark ? 'text-[#A3A29B]' : 'text-[#5C5B54]'}`}>Verify physical checklists, disburse secure payouts, and observe database state variables.</p>
          </div>
        </div>

        <div className={`flex gap-1.5 p-1 rounded-xl border text-xs font-semibold ${isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-[#ECEAE2]/60 border-[#C5C4BA]'}`}>
          <button 
            onClick={() => setActiveTab('VERIFICATIONS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'VERIFICATIONS' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-[#5C5B54] hover:text-[#1A1A1A]')
            }`}
          >
            Physical 7-Point Gates
          </button>
          <button 
            onClick={() => setActiveTab('LEDGER')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'LEDGER' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-[#5C5B54] hover:text-[#1A1A1A]')
            }`}
          >
            Splits & Escrow Ledger
          </button>
          <button 
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'ANALYTICS' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-[#5C5B54] hover:text-[#1A1A1A]')
            }`}
          >
            Analytics Overview
          </button>
          <button 
            onClick={() => setActiveTab('DB_CONSOLE')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'DB_CONSOLE' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-[#5C5B54] hover:text-[#1A1A1A]')
            }`}
          >
            Database Console
          </button>
          <button 
            onClick={() => setActiveTab('REPORTS')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'REPORTS' 
                ? (isDark ? 'bg-[#E2E1DA] text-[#1A1A1A] shadow-xs' : 'bg-[#1A1A1A] text-[#E2E1DA] shadow-xs') 
                : (isDark ? 'text-[#A3A29B] hover:text-[#E2E1DA]' : 'text-[#5C5B54] hover:text-[#1A1A1A]')
            }`}
          >
            Customer Reports
          </button>
        </div>
      </div>

      {/* Developer quick action sweeps */}
      <div className={`border p-3 rounded-xl flex flex-wrap gap-2 items-center justify-between text-xs mb-4 ${
        isDark ? 'bg-[#1D1D1C] border-[#383837]/60 text-[#E2E1DA]' : 'bg-[#ECEAE2]/40 border-[#C5C4BA]/50 text-[#1A1A1A]'
      }`}>
        <span className={`font-mono text-[10px] font-bold ${isDark ? 'text-[#A3A29B]' : 'text-[#5C5B54]'}`}>🤖 SANDBOX SCRIPTS CONTROLLER:</span>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handleCustomCronRenewals}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-1 transition font-bold cursor-pointer border ${
              isDark ? 'bg-[#2D2D2C] hover:bg-[#333332] text-[#E2E1DA] border-[#383837]' : 'bg-[#FDFDFB] hover:bg-[#F5F4EE] text-[#1A1A1A] border-[#C5C4BA]'
            }`}
          >
            <Play className="w-3 h-3 text-zinc-400" /> Sweep 21d Leases (WhatsApp Alerts)
          </button>
          <button 
            onClick={handleCustomCronPayouts}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-1 transition font-bold cursor-pointer border ${
              isDark ? 'bg-[#2D2D2C] hover:bg-[#333332] text-[#E2E1DA] border-[#383837]' : 'bg-[#FDFDFB] hover:bg-[#F5F4EE] text-[#1A1A1A] border-[#C5C4BA]'
            }`}
          >
            <Play className="w-3 h-3 text-zinc-400" /> Sweep 48h Escrows
          </button>
          <button 
            onClick={handleResetDatabase}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-mono flex items-center gap-1 transition font-bold cursor-pointer border ${
              isDark ? 'bg-[#333332] hover:bg-red-950/20 text-red-400 border-red-900/30' : 'bg-[#ECEAE2] hover:bg-red-50 text-red-700 border-red-200'
            }`}
          >
            <RefreshCw className="w-3 h-3" /> Reset Seeds
          </button>
        </div>
      </div>

      {/* ==================================== */}
      {/* 1. PHYSICAL 7-POINT VERIFICATIONS */}
      {/* ==================================== */}
      {activeTab === 'VERIFICATIONS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          
          {/* Left Block - Property select with raw rent figures */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex justify-between items-center">
              <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Listings Index</h4>
              <button
                type="button"
                onClick={() => {
                  setIsAddingProperty(!isAddingProperty);
                  // Auto-select first contact if none selected
                  if (!adminCaretakerId && (apiState.contacts || []).length > 0) {
                    setAdminCaretakerId(apiState.contacts[0].contact_id);
                  }
                }}
                className={`px-2 py-1 rounded text-[9px] font-bold tracking-tight cursor-pointer transition ${
                  isAddingProperty 
                    ? 'bg-rose-600 hover:bg-rose-500 text-white' 
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isAddingProperty ? 'Cancel Add' : '+ Add New Listing'}
              </button>
            </div>
            
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {(apiState.properties || []).map((p: any) => {
                const isSelected = selectedPropertyId === p.property_id;
                return (
                  <div 
                    key={p.property_id}
                    onClick={() => { setSelectedPropertyId(p.property_id); setMessage(''); }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition ${
                      isSelected 
                        ? (isDark ? 'bg-[#2D2D2C] border-[#E2E1DA] text-[#E2E1DA]' : 'bg-[#ECEAE2] border-[#1A1A1A] text-[#1A1A1A]') 
                        : (isDark ? 'bg-[#1E1E1D] border-[#383837]/60 text-[#A3A29B]/90 hover:border-[#4D4C4A]' : 'bg-[#FDFDFB] border-[#C5C4BA]/50 text-[#5C5B54] hover:border-[#A8A7A0]')
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className={`font-mono font-bold text-[11px] ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>{p.property_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase border ${
                        p.availability === 'Available' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                        p.availability === 'Taken' ? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      }`}>
                        {p.availability}
                      </span>
                    </div>
                    <p className={`font-semibold text-[11px] ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>{p.property_type} • {p.zone}</p>
                    
                    {/* Sensitive internal rent displayed to admin only */}
                    <div className={`mt-1.5 pt-1.5 border-t text-[10px] flex justify-between ${isDark ? 'border-[#383837]/40' : 'border-[#C5C4BA]/20'}`}>
                      <span>Internal Rent: <strong className={isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}>₦{Number(p.landlord_rent).toLocaleString()}</strong></span>
                      <span>Total: <strong className={isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}>₦{Number(p.total_listed_price).toLocaleString()}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Block - Checklist scoring form or Add Property Form */}
          <div className={`lg:col-span-8 border p-4 rounded-xl space-y-4 ${
            isDark ? 'bg-[#1D1D1C] border-[#383837]' : 'bg-[#ECEAE2]/40 border-[#C5C4BA]'
          }`}>
            {isAddingProperty ? (
              <form onSubmit={handleAdminCreateProperty} className="space-y-4 text-[#1A1A1A]">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-200">
                  <h4 className={`text-sm font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>
                    Create New Property Listing
                  </h4>
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase font-extrabold">
                    Admin Direct Entry
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Caretaker / Owner Dropdown */}
                  <div className="md:col-span-2">
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Assigned Contact / Caretaker (from Directory) *
                    </label>
                    <select
                      value={adminCaretakerId}
                      onChange={e => setAdminCaretakerId(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    >
                      <option value="">-- Select Contact / Caretaker --</option>
                      {(apiState.contacts || []).map((c: any) => (
                        <option key={c.contact_id} value={c.contact_id}>
                          {c.full_name} ({c.contact_type} - {c.contact_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Zone */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Zone *
                    </label>
                    <select
                      value={adminZone}
                      onChange={e => setAdminZone(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    >
                      <option value="Gidan Kwano">Gidan Kwano</option>
                      <option value="Jatapi">Jatapi</option>
                      <option value="Dama">Dama</option>
                      <option value="Gidan Managoro">Gidan Managoro</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Property Type */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Property Type *
                    </label>
                    <select
                      value={adminPropertyType}
                      onChange={e => setAdminPropertyType(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    >
                      <option value="Self-contain">Self-contain</option>
                      <option value="Room & Parlour">Room & Parlour</option>
                      <option value="Mini Flat">Mini Flat</option>
                      <option value="Shared Room">Shared Room</option>
                      <option value="Studio">Studio</option>
                    </select>
                  </div>

                  {/* Street Landmark */}
                  <div className="md:col-span-2">
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Street Landmark *
                    </label>
                    <input
                      type="text"
                      value={adminStreetLandmark}
                      onChange={e => setAdminStreetLandmark(e.target.value)}
                      placeholder="e.g. Behind FUTMINNA Main Gate, adjacent Apex Clinic"
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Number of Bedrooms *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={adminBedrooms}
                      onChange={e => setAdminBedrooms(Number(e.target.value))}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Bathroom Type */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Bathroom Type *
                    </label>
                    <select
                      value={adminBathroomType}
                      onChange={e => setAdminBathroomType(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    >
                      <option value="Flush">Flush</option>
                      <option value="Squatting">Squatting</option>
                      <option value="Shared Flush">Shared Flush</option>
                      <option value="Shared Squatting">Shared Squatting</option>
                    </select>
                  </div>

                  {/* Water Source */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Water Source *
                    </label>
                    <select
                      value={adminWaterSource}
                      onChange={e => setAdminWaterSource(e.target.value as any)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    >
                      <option value="Borehole">Borehole</option>
                      <option value="Well">Well</option>
                      <option value="Public">Public</option>
                      <option value="Tanker">Tanker</option>
                    </select>
                  </div>

                  {/* Distance to Campus */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Distance to Campus *
                    </label>
                    <input
                      type="text"
                      value={adminDistanceToCampus}
                      onChange={e => setAdminDistanceToCampus(e.target.value)}
                      placeholder="e.g. 5-minute walk"
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Landlord Rent */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Landlord Desired Rent (₦/yr) *
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={5000}
                      value={adminLandlordRent}
                      onChange={e => setAdminLandlordRent(Number(e.target.value))}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Lease Expiry Estimate */}
                  <div>
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Lease Expiry Estimate *
                    </label>
                    <input
                      type="date"
                      value={adminLeaseExpiry}
                      onChange={e => setAdminLeaseExpiry(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                      required
                    />
                  </div>

                  {/* Map Location */}
                  <div className="md:col-span-2">
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Map Location coordinates (optional)
                    </label>
                    <input
                      type="text"
                      value={adminMapLocation}
                      onChange={e => setAdminMapLocation(e.target.value)}
                      placeholder="e.g. 9.5936, 6.4748"
                      className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                    />
                  </div>

                  {/* Checkboxes: Has Kitchen, Accepts Half Session */}
                  <div className="flex flex-wrap gap-5 py-1 md:col-span-2">
                    <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-700'}`}>
                      <input
                        type="checkbox"
                        checked={adminHasKitchen}
                        onChange={e => setAdminHasKitchen(e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                      />
                      Has Kitchen Area
                    </label>

                    <label className={`flex items-center gap-2 text-xs font-semibold cursor-pointer ${isDark ? 'text-[#E2E1DA]' : 'text-zinc-700'}`}>
                      <input
                        type="checkbox"
                        checked={adminAcceptsHalfSession}
                        onChange={e => setAdminAcceptsHalfSession(e.target.checked)}
                        className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 w-4 h-4 cursor-pointer"
                      />
                      Accepts Half Session Payout
                    </label>
                  </div>

                  {/* Pre-filled Stock Image upload banner */}
                  <div className="md:col-span-2">
                    <label className={`block text-[10px] uppercase font-bold tracking-wider mb-1 ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      Verification Room Photos Gallery
                    </label>
                    <div className="bg-zinc-100 border border-dashed border-zinc-300 p-3 rounded-xl text-center space-y-1">
                      <UploadCloud className="w-6 h-6 text-zinc-400 mx-auto" />
                      <span className="block text-[10px] text-zinc-500 font-medium">8 default room images are auto-prepared.</span>
                      <span className="text-[9px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full inline-block font-extrabold uppercase">
                        ✓ Ready (8 / 8)
                      </span>
                    </div>
                  </div>

                  {/* Live Breakdown Preview */}
                  <div className="md:col-span-2">
                    <div className={`p-3 rounded-lg flex flex-col gap-1.5 text-[11px] border ${
                      isDark ? 'bg-zinc-800 border-zinc-700 text-[#E2E1DA]' : 'bg-[#ECEAE2]/40 border-[#C5C4BA]/50 text-zinc-800'
                    }`}>
                      <span className="font-bold uppercase text-[9px] tracking-wider text-zinc-550">
                        Internal Pricing Breakdown Preview
                      </span>
                      <div className="flex justify-between">
                        <span>Landlord Desired Rent:</span>
                        <span className="font-mono font-bold">₦{adminLandlordRent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Lodga Connection Fee (MAX 8% vs ₦12,000):</span>
                        <span className="font-mono">₦{Math.max(adminLandlordRent * 0.08, 12000).toLocaleString()}</span>
                      </div>
                      <div className={`flex justify-between border-t pt-1.5 font-extrabold text-xs ${
                        isDark ? 'border-zinc-700 text-[#E2E1DA]' : 'border-[#C5C4BA]/40 text-zinc-900'
                      }`}>
                        <span>Catalog Listing Price (Total):</span>
                        <span className="font-mono">
                          ₦{(adminLandlordRent + Math.max(adminLandlordRent * 0.08, 12000)).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingProperty(false)}
                    className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold py-2 px-4 rounded-lg cursor-pointer text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-zinc-950 hover:bg-zinc-850 text-white font-semibold py-2 px-5 rounded-lg cursor-pointer text-xs transition"
                  >
                    Publish Admin Direct Listing
                  </button>
                </div>
              </form>
            ) : selectedProperty ? (
              <form onSubmit={handleApply7Checklist} className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-[#E2E1DA]' : 'text-[#1A1A1A]'}`}>Physical Verification File: {selectedPropertyId}</h4>
                    <span className="text-[10px] font-mono text-zinc-400">Caretaker contact reference: {selectedProperty.caretaker_id}</span>
                  </div>
                  
                  {/* Gate Controller activate button */}
                  <div className="flex gap-1.5 shrink-0">
                    <button 
                      type="button"
                      onClick={() => handleUpdateAvailability(selectedPropertyId, 'Available')}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1 cursor-pointer text-xs shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Enforce Gate & Activate
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleUpdateAvailability(selectedPropertyId, 'Suspended')}
                      className="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold py-1.5 px-3.5 rounded-lg cursor-pointer text-xs"
                    >
                      Suspend
                    </button>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#1E1E1D] border-[#383837]/60' : 'bg-[#FAF9F5] border-[#C5C4BA]/40'} space-y-3`}>
                  <div className="flex justify-between items-center">
                    <div>
                      <h5 className="text-xs font-extrabold flex items-center gap-1.5 text-blue-600 uppercase tracking-wide">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Step 1: Lodga Live Location Pinning</span>
                      </h5>
                      <p className={`text-[10px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-650'}`}>Type coordinates/address or tap/click directly on the map to pin precise coordinates.</p>
                    </div>
                    {pinnedLat && pinnedLng && (
                      <span className="text-[9px] font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                        {pinnedLat.toFixed(5)}, {pinnedLng.toFixed(5)}
                      </span>
                    )}
                  </div>

                  {/* Search / Address Autocomplete Lookup */}
                  <div className="flex gap-2 text-xs">
                    <input 
                      type="text" 
                      placeholder="Search landmark/street (e.g. Gidan Kwano, Minna)" 
                      id="admin-search-input"
                      defaultValue={selectedProperty.street_landmark || ''}
                      className="flex-grow p-2 border rounded bg-zinc-50 border-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        const input = document.getElementById('admin-search-input') as HTMLInputElement;
                        if (!input || !input.value) return;
                        setPinningMessage('Searching place details...');
                        try {
                          // Geocoding helper with predefined locations near Gidan Kwano or fallback random jitter
                          const val = input.value.toLowerCase();
                          let lat = 9.0765;
                          let lng = 6.5095;
                          if (val.includes('jatapi')) {
                            lat = 9.0781; lng = 6.5150;
                          } else if (val.includes('dama')) {
                            lat = 9.0795; lng = 6.5020;
                          } else if (val.includes('managoro')) {
                            lat = 9.0720; lng = 6.5120;
                          } else if (val.includes('gidan kwano')) {
                            lat = 9.0765; lng = 6.5095;
                          } else {
                            lat = 9.0765 + (Math.random() - 0.5) * 0.005;
                            lng = 6.5095 + (Math.random() - 0.5) * 0.005;
                          }
                          setPinnedLat(lat);
                          setPinnedLng(lng);
                          setPinningMessage('Found coordinate center on map. Drag or tap to refine.');
                        } catch (err) {
                          setPinningMessage('Search failed.');
                        }
                      }}
                      className="bg-blue-600 text-white px-3.5 py-2 rounded font-bold hover:bg-blue-700 transition cursor-pointer"
                    >
                      Search
                    </button>
                  </div>

                  {/* Active Google Map rendering */}
                  <div className="h-[220px] rounded-lg overflow-hidden border border-zinc-200 relative">
                    {GOOGLE_MAPS_API_KEY ? (
                      <APIProvider apiKey={GOOGLE_MAPS_API_KEY} version="weekly">
                        <GMap
                          center={{ lat: pinnedLat || 9.0765, lng: pinnedLng || 6.5095 }}
                          zoom={15}
                          mapId="ADMIN_VERIFY_MAP"
                          gestureHandling={'cooperative'}
                          disableDefaultUI={true}
                          onClick={(e) => {
                            if (e.detail.latLng) {
                              setPinnedLat(e.detail.latLng.lat);
                              setPinnedLng(e.detail.latLng.lng);
                              setPinningMessage('Selected coordinates by tapping map.');
                            }
                          }}
                          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                          style={{ width: '100%', height: '100%' }}
                        >
                          <AdvancedMarker
                            position={{ lat: pinnedLat || 9.0765, lng: pinnedLng || 6.5095 }}
                            draggable={true}
                            onDragEnd={(e) => {
                              if (e.latLng) {
                                setPinnedLat(e.latLng.lat());
                                setPinnedLng(e.latLng.lng());
                                setPinningMessage('Refined pinned coordinates.');
                              }
                            }}
                          >
                            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-600 border-2 border-white shadow-lg animate-bounce">
                              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                              </svg>
                            </div>
                          </AdvancedMarker>
                        </GMap>
                      </APIProvider>
                    ) : (
                      <div className="absolute inset-0 bg-zinc-100 flex flex-col justify-center items-center p-4 text-center text-zinc-450 space-y-1">
                        <span className="font-bold text-xs text-zinc-600">Simulated Inspector Map View</span>
                        <p className="text-[10px] max-w-[280px]">No live API key is set yet. Tap coordinates below to simulate location pinning.</p>
                        <div className="flex gap-1.5 mt-2">
                          <button
                            type="button"
                            onClick={() => { setPinnedLat(9.0781); setPinnedLng(6.5150); setPinningMessage('Pinned near Jatapi Campus Gate.'); }}
                            className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-2 py-1 rounded hover:bg-zinc-300"
                          >
                            Jatapi Gate
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPinnedLat(9.0795); setPinnedLng(6.5020); setPinningMessage('Pinned near Dama Dorms.'); }}
                            className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-2 py-1 rounded hover:bg-zinc-300"
                          >
                            Dama Area
                          </button>
                          <button
                            type="button"
                            onClick={() => { setPinnedLat(9.0720); setPinnedLng(6.5120); setPinningMessage('Pinned near Gidan Managoro Area.'); }}
                            className="bg-zinc-200 text-zinc-700 text-[9px] font-bold px-2 py-1 rounded hover:bg-zinc-300"
                          >
                            Managoro
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-zinc-500">
                    <span>{pinningMessage || 'Drag marker or tap map to set pin location.'}</span>
                    <button
                      type="button"
                      disabled={!pinnedLat || !pinnedLng}
                      onClick={async () => {
                        if (!pinnedLat || !pinnedLng) return;
                        setPinningMessage('Saving location...');
                        try {
                          const res = await fetch(`/api/admin/properties/${selectedPropertyId}/pin-location`, {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                              latitude: pinnedLat,
                              longitude: pinnedLng,
                              google_maps_place_id: 'place_' + Math.random().toString(36).substr(2, 9)
                            })
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setPinningMessage('✓ Coordinates pinned & synced to database!');
                            setChk8('Pass'); // Auto set checklist 8 to pass once pinned!
                            onRefresh();
                          } else {
                            setPinningMessage(data.error || 'Sync error.');
                          }
                        } catch (err) {
                          setPinningMessage('Network error.');
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-[10px] disabled:opacity-50 transition cursor-pointer"
                    >
                      Save Pinned Location
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-zinc-500 leading-normal">
                  ⚠️ <strong>Admin Hard Gate Restriction:</strong> Availability status cannot be toggled to 'Available' unless all 8 distinct physical checkpoints pass audit checklist parameters.
                </p>

                {message && (
                  <div className="bg-zinc-100 border border-zinc-200 p-2.5 rounded-lg text-xs font-mono text-zinc-800">
                    {message}
                  </div>
                )}

                {/* 8 Checkpoint sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-b border-zinc-150 py-3.5 text-xs text-zinc-800">
                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg">
                    <span className="font-medium">1. Physical Visit confirmed?</span>
                    <select value={chk1} onChange={e => setChk1(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg">
                    <span className="font-medium">2. Photos match reality?</span>
                    <select value={chk2} onChange={e => setChk2(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg">
                    <span className="font-medium">3. Owner identity ID verified?</span>
                    <select value={chk3} onChange={e => setChk3(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg">
                    <span className="font-medium">4. Ownership deeds valid?</span>
                    <select value={chk4} onChange={e => setChk4(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg">
                    <span className="font-medium">5. No hidden fees contract?</span>
                    <select value={chk5} onChange={e => setChk5(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg">
                    <span className="font-medium">6. Borehole water checked?</span>
                    <select value={chk6} onChange={e => setChk6(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg md:col-span-2">
                    <span className="font-medium">7. Historical inspections complete?</span>
                    <select value={chk7} onChange={e => setChk7(e.target.value as any)} className="bg-zinc-50 border border-zinc-200 text-[11px] rounded p-1 text-zinc-800 focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div className="flex justify-between items-center bg-white border border-zinc-200 p-2.5 rounded-lg md:col-span-2">
                    <span className="font-medium text-blue-600 font-extrabold">8. Live Map Location Pinned? (First step)</span>
                    <select value={chk8} onChange={e => setChk8(e.target.value as any)} className="bg-zinc-100 border border-blue-200 text-[11px] rounded p-1 text-zinc-800 font-bold focus:outline-none">
                      <option value="Pass">✓ Pass</option>
                      <option value="Fail">✗ Fail</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-zinc-450 uppercase font-bold tracking-wider mb-1">Audit verification journal log</label>
                  <textarea 
                    value={auditNotes}
                    onChange={e => setAuditNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-white border border-zinc-200 text-xs px-2.5 py-2 rounded-lg focus:outline-none focus:border-zinc-500 text-zinc-800"
                  ></textarea>
                </div>

                <div className="flex justify-end">
                  <button 
                    type="submit"
                    className="bg-zinc-950 hover:bg-zinc-850 text-white font-semibold py-2 px-5 rounded-lg cursor-pointer text-xs transition"
                  >
                    Commit Checklist Scorecard
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-zinc-400 text-center py-10">Select a property listing to score verification points.</p>
            )}
          </div>

        </div>
      )}

      {/* ==================================== */}
      {/* 2. SPLITS, ESCROWS, AND CLIENT REGISTER */}
      {/* ==================================== */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-6 text-xs">
          
          {/* Active transactions ledger with split-out payouts */}
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
            <div className="px-4 py-3 border-b border-zinc-150 bg-zinc-50/50">
              <h4 className="font-bold text-zinc-700 text-[11px] uppercase tracking-wider">Escrow Transactions Split-Ledger Log</h4>
            </div>

            <div className="overflow-x-auto">
              {(apiState.transactions || []).length === 0 ? (
                <div className="p-8 text-center text-zinc-400">No placements logged.</div>
              ) : (
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-zinc-50/50 text-zinc-500 uppercase tracking-wider text-[10px] border-b border-zinc-200 font-bold">
                    <tr>
                      <th className="px-4 py-3">TXN Code</th>
                      <th className="px-4 py-3">Landlord Portion</th>
                      <th className="px-4 py-3">Verification split</th>
                      <th className="px-4 py-3">Inspection</th>
                      <th className="px-4 py-3">Total Paid</th>
                      <th className="px-4 py-3">Escrow Status</th>
                      <th className="px-4 py-3 text-right">Settlement release</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-[11px]">
                    {(apiState.transactions || []).map((t: any) => (
                      <tr key={t.transaction_id} className="hover:bg-zinc-50/30 transition">
                        <td className="px-4 py-3.5 font-mono text-zinc-500 font-bold">{t.transaction_id}</td>
                        <td className="px-4 py-3.5 text-zinc-800 font-mono font-medium">₦{Number(t.landlord_rent).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-zinc-800 font-mono font-medium">₦{Number(t.connection_fee).toLocaleString()}</td>
                        <td className="px-4 py-3.5 text-zinc-500 font-mono">₦{Number(t.inspection_fee || 0).toLocaleString()}</td>
                        <td className="px-4 py-3.5 font-mono font-bold text-zinc-950">₦{Number(t.total_paid || (Number(t.landlord_rent) + Number(t.connection_fee) + Number(t.inspection_fee))).toLocaleString()}</td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border-xs ${
                            t.escrow_status === 'Held' ? 'bg-zinc-100 text-zinc-700 border-zinc-200' :
                            t.escrow_status === 'Released' ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 'bg-red-50 text-red-700 border-red-150'
                          }`}>
                            {t.escrow_status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold space-x-1">
                          {t.escrow_status === 'Held' && (
                            <>
                              <button 
                                onClick={() => handleEscrowPayoutAction(t.transaction_id, 'release')}
                                className="bg-zinc-950 hover:bg-zinc-850 text-white px-2.5 py-1 rounded text-[10px] cursor-pointer shadow-xs font-semibold"
                              >
                                Disburse Rent
                              </button>
                              <button 
                                onClick={() => handleEscrowPayoutAction(t.transaction_id, 'refund')}
                                className="bg-white border border-red-300 hover:bg-red-50 text-red-700 px-2.5 py-1 rounded text-[10px] cursor-pointer font-semibold"
                              >
                                Refund (Dispute)
                              </button>
                            </>
                          )}
                          {t.escrow_status !== 'Held' && (
                            <span className="text-zinc-450 text-[10px] font-medium italic">Completed ({t.escrow_status})</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Supply side registry directory */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Contacts Table */}
            <div className="lg:col-span-8 bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-xs">
              <div className="px-4 py-3 border-b border-zinc-150 bg-zinc-50/50">
                <h4 className="font-bold text-zinc-700 text-[11px] uppercase tracking-wider">Lodges Directory Registry roster</h4>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-[11px]">
                  <thead className="bg-zinc-50/50 text-zinc-500 uppercase tracking-wider text-[9px] border-b border-zinc-200 font-bold">
                    <tr>
                      <th className="px-4 py-2.5">ID</th>
                      <th className="px-4 py-2.5">Name</th>
                      <th className="px-4 py-2.5">Mobile</th>
                      <th className="px-4 py-2.5">Zone/Type</th>
                      <th className="px-4 py-2.5">Verification Trust</th>
                      <th className="px-4 py-2.5">Renewal Pings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-150 text-zinc-650">
                    {(apiState.contacts || []).map((cont: any) => (
                      <tr key={cont.contact_id}>
                        <td className="px-4 py-2.5 font-mono text-zinc-500 font-bold">{cont.contact_id}</td>
                        <td className="px-4 py-2.5 font-bold text-zinc-900">{cont.full_name}</td>
                        <td className="px-4 py-2.5 font-mono text-zinc-600">{cont.phone}</td>
                        <td className="px-4 py-2.5 text-zinc-600 font-medium">{cont.zone} • {cont.contact_type}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-block px-2 border-xs py-0.5 rounded text-[8px] font-bold bg-emerald-50 text-emerald-700 border-emerald-150">
                            High Trust
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {Number(cont.renewal_pings_count) > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[8px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                              Pings Received: {cont.renewal_pings_count}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[8px] font-bold bg-zinc-100 text-zinc-400 border border-zinc-200/60">
                              No Renewal Pings
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Register Contact profile */}
            <form onSubmit={handleCreateContactSubmit} className="lg:col-span-4 bg-zinc-50/50 border border-zinc-200 p-4 rounded-xl space-y-3 shadow-xs">
              <h4 className="font-extrabold text-[11px] text-zinc-900 uppercase tracking-wider block">Add supply participant</h4>
              
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={pubName}
                  onChange={e => setPubName(e.target.value)}
                  placeholder="Mallam Ibrahim"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Nigerian Phone</label>
                <input 
                  type="text" 
                  value={pubPhone}
                  onChange={e => setPubPhone(e.target.value)}
                  placeholder="08012345678"
                  className="w-full bg-white border border-zinc-200 rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Zone</label>
                  <select value={pubZone} onChange={e => setPubZone(e.target.value)} className="w-full bg-white border border-zinc-200 text-[11px] rounded p-1 text-zinc-700 focus:outline-none">
                    <option value="Gidan Kwano">Gidan Kwano</option>
                    <option value="Jatapi">Jatapi</option>
                    <option value="Dama">Dama</option>
                    <option value="Gidan Managoro">Gidan Managoro</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 block mb-1">Role Type</label>
                  <select value={pubType} onChange={e => setPubType(e.target.value as any)} className="w-full bg-white border border-zinc-200 text-[11px] rounded p-1 text-zinc-700 focus:outline-none">
                    <option value="Caretaker">Caretaker</option>
                    <option value="Landlord">Landlord</option>
                    <option value="Agent">Agent</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-zinc-950 hover:bg-zinc-855 text-white font-bold py-2 rounded-lg text-xs cursor-pointer shadow-xs"
              >
                Register Directory Profile
              </button>
            </form>
          </div>

        </div>
      )}

      {/* ==================================== */}
      {/* 3. ABSOLUTE DB CONSOLE (JSON STATE) */}
      {/* ==================================== */}
      {activeTab === 'DB_CONSOLE' && (
        <div className="space-y-4 text-xs font-mono">
          <div className={`flex justify-between items-center px-4 py-2.5 rounded-lg border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200/80'
          }`}>
            <span className={`font-bold text-[10px] ${isDark ? 'text-zinc-400' : 'text-zinc-650'}`}>IN-MEMORY STATE DIRECTORIES (PG CONVERSION REPRESENTATIONS)</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={downloadDatabaseConsolePDF}
                className={`text-[10px] border px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition font-bold ${
                  isDark ? 'bg-emerald-900/30 border-emerald-850 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Download className="w-3 h-3" /> Download Database PDF
              </button>
              <button onClick={onRefresh} className={`text-[10px] font-bold border px-2.5 py-1 rounded flex items-center gap-1 cursor-pointer transition ${
                isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-zinc-250 text-zinc-850 hover:bg-zinc-50'
              }`}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
              <span className="text-zinc-800 font-bold block mb-2 border-b border-zinc-200 pb-1 flex justify-between">
                <span>1. Users Dictionary ({ (apiState.users || []).length })</span>
                <span className="text-zinc-400 text-[9px] font-mono">JSON Row List</span>
              </span>
              <pre className="text-[10px] text-zinc-650 overflow-x-auto max-h-[160px] whitespace-pre-wrap">{JSON.stringify(apiState.users || [], null, 2)}</pre>
            </div>

            <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
              <span className="text-zinc-800 font-bold block mb-2 border-b border-zinc-200 pb-1 flex justify-between">
                <span>2. Properties Dictionary ({ (apiState.properties || []).length })</span>
                <span className="text-zinc-400 text-[9px] font-mono">JSON Row List</span>
              </span>
              <pre className="text-[10px] text-zinc-650 overflow-x-auto max-h-[160px] whitespace-pre-wrap">{JSON.stringify(apiState.properties || [], null, 2)}</pre>
            </div>

            <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
              <span className="text-zinc-800 font-bold block mb-2 border-b border-zinc-200 pb-1 flex justify-between">
                <span>3. Transactions Dictionary ({ (apiState.transactions || []).length })</span>
                <span className="text-zinc-400 text-[9px] font-mono">JSON Row List</span>
              </span>
              <pre className="text-[10px] text-zinc-650 overflow-x-auto max-h-[160px] whitespace-pre-wrap">{JSON.stringify(apiState.transactions || [], null, 2)}</pre>
            </div>

            <div className="bg-zinc-50 p-4 border border-zinc-200 rounded-xl overflow-hidden shadow-xs">
              <span className="text-zinc-800 font-bold block mb-2 border-b border-zinc-200 pb-1 flex justify-between">
                <span>4. Physical Checkpoints Checklist ({ (apiState.verification_checks || []).length })</span>
                <span className="text-zinc-400 text-[9px] font-mono">JSON Row List</span>
              </span>
              <pre className="text-[10px] text-zinc-650 overflow-x-auto max-h-[160px] whitespace-pre-wrap">{JSON.stringify(apiState.verification_checks || [], null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 4. ANALYTICS OVERVIEW DASHBOARD */}
      {/* ==================================== */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Action Header Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50/60 border-zinc-200/80'
          }`}>
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-500">Live Housing Analytics Dashboard</h4>
              <p className="text-[10px] text-zinc-500 font-medium font-sans">Download complete analytical reports, trace live interaction logs, and view student escrow performance metrics.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button 
                onClick={downloadAnalyticsPDF}
                className={`text-[10px] border px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold transition ${
                  isDark ? 'bg-emerald-900/30 border-emerald-850 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> Download Analytics PDF
              </button>
              <button 
                onClick={downloadTelemetryJSON}
                className={`text-[10px] border px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer font-bold transition ${
                  isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700' : 'bg-white border-zinc-250 text-zinc-700 hover:bg-zinc-50'
                }`}
                title="Download full JSON event stream log"
              >
                <FileText className="w-3.5 h-3.5" /> Download Telemetry (JSON)
              </button>
            </div>
          </div>

          {/* Executive Stats Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className={`p-4 rounded-xl border transition-all ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Total Directory Listings</span>
                <Layers className="w-4 h-4 text-zinc-400" />
              </div>
              <strong className="text-2xl font-extrabold font-mono">{propertiesList.length}</strong>
              <span className="text-[9px] text-zinc-400 block mt-1">Properties listed across 5 zones</span>
            </div>
            
            <div className={`p-4 rounded-xl border transition-all ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-[#A3A29B] font-bold">Funds In Escrow Lock</span>
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <strong className="text-2xl font-extrabold font-mono text-blue-500">
                ₦{Number(transactionsList.filter((t: any) => t.escrow_status === 'Held').reduce((sum: number, t: any) => sum + Number(t.total_price || 0), 0)).toLocaleString()}
              </strong>
              <span className="text-[9px] text-zinc-400 block mt-1">Pending student move-in</span>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Settled Payouts Release</span>
                <Check className="w-4 h-4 text-emerald-400" />
              </div>
              <strong className="text-2xl font-extrabold font-mono text-emerald-500">
                ₦{Number(transactionsList.filter((t: any) => t.escrow_status === 'Released').reduce((sum: number, t: any) => sum + Number(t.landlord_rent || 0), 0)).toLocaleString()}
              </strong>
              <span className="text-[9px] text-zinc-400 block mt-1">Released to academic landlords</span>
            </div>

            <div className={`p-4 rounded-xl border transition-all ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Active Disputes Hold</span>
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <strong className="text-2xl font-extrabold font-mono text-red-500">
                {transactionsList.filter((t: any) => t.escrow_status === 'Disputed').length} Active
              </strong>
              <span className="text-[9px] text-zinc-400 block mt-1">Escrow held on active disputes</span>
            </div>

            {/* NEW STAT CARD 1: PLATFORM REVENUE */}
            <div className={`p-4 rounded-xl border transition-all ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Platform Revenue</span>
                <TrendingUp className="w-4 h-4 text-violet-400" />
              </div>
              <strong className="text-2xl font-extrabold font-mono text-violet-500">
                ₦{Number(transactionsList.filter((t: any) => t.escrow_status === 'Released' || t.escrow_status === 'Held').reduce((sum: number, t: any) => sum + Number(t.connection_fee || 0), 0)).toLocaleString()}
              </strong>
              <span className="text-[9px] text-zinc-400 block mt-1">Total connection fees collected</span>
            </div>

            {/* NEW STAT CARD 2: SAFETY REPORTS */}
            <div className={`p-4 rounded-xl border transition-all ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Safety Reports Lodged</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <strong className="text-2xl font-extrabold font-mono text-amber-500">
                {reportsList.length} Case{reportsList.length === 1 ? '' : 's'}
              </strong>
              <span className="text-[9px] text-zinc-400 block mt-1">Total active compliance alerts</span>
            </div>
          </div>

          {/* charts list */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Supply Trends */}
            <div className={`p-5 rounded-xl border ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="mb-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Property Supply Demands by Area Zone</h4>
                <p className="text-[10px] text-zinc-450">Total verified and pending supplies grouped by local student zones.</p>
              </div>
              <div className="w-full text-zinc-800" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke={isDark ? '#A3A29B' : '#71717A'} />
                    <YAxis tick={{ fontSize: 9 }} stroke={isDark ? '#A3A29B' : '#71717A'} allowDecimals={false} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className={`p-2.5 rounded-lg border shadow-lg text-[10px] ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
                              <p className="font-extrabold mb-1">{label}</p>
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span>Properties: <strong className={isDark ? 'text-white font-extrabold' : 'text-zinc-950 font-extrabold'}>{payload[0].value}</strong></span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="Count" fill={isDark ? '#3B82F6' : '#1D4ED8'} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Escrow status distribution */}
            <div className={`p-5 rounded-xl border ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="mb-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Escrow Status Guarantee Distribution</h4>
                <p className="text-[10px] text-zinc-450">Audit trail of transactions locked, released, or refunded in study panel.</p>
              </div>
              <div className="w-full flex flex-col md:flex-row items-center justify-between" style={{ height: 260 }}>
                <div className="w-full md:w-3/5 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={escrowChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {escrowChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className={`p-2.5 rounded-lg border shadow-lg text-[10px] ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'}`}>
                                <p className="font-extrabold mb-1">{data.name}</p>
                                <div className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: data.color }} />
                                  <span>Transactions: <strong className={isDark ? 'text-white font-extrabold' : 'text-zinc-950 font-extrabold'}>{data.value}</strong></span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full md:w-2/5 space-y-2 px-2 text-[10px]">
                  {escrowChartData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-zinc-400">{item.name}</span>
                      </div>
                      <strong className="font-mono font-bold">{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3: Average Pricing Profile */}
            <div className={`p-5 rounded-xl border lg:col-span-2 ${
              isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
            }`}>
              <div className="mb-4">
                <h4 className="font-extrabold text-xs uppercase tracking-wider">Average Zone Pricing & Connection Fee Rates (₦)</h4>
                <p className="text-[10px] text-zinc-455">Analysis of the mean annual rent and platform connection fees by geographic zones.</p>
              </div>
              <div className="w-full" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={averageRentByZone} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="zone" tick={{ fontSize: 9 }} stroke={isDark ? '#A3A29B' : '#71717A'} />
                    <YAxis tick={{ fontSize: 9 }} stroke={isDark ? '#A3A29B' : '#71717A'} />
                    <Tooltip 
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className={`p-2.5 rounded-lg border shadow-lg text-[10px] ${isDark ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'} space-y-1`}>
                              <p className="font-extrabold border-b pb-1 border-zinc-700/20">{label} Zone</p>
                              {payload.map((p: any, i: number) => (
                                <div key={i} className="flex items-center justify-between gap-4">
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                    {p.name}:
                                  </span>
                                  <strong className="font-mono">₦{Number(p.value).toLocaleString()}</strong>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="Avg Rent" stroke="#3B82F6" strokeWidth={2.5} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Avg Connection Fee" stroke="#10B981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Live Telemetry Log Component */}
          <div className={`p-5 rounded-xl border transition-all ${
            isDark ? 'bg-[#1E1E1D] border-[#383837]' : 'bg-white border-zinc-200'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200/50 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                  <Terminal className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider">Live User Telemetry Audit Stream</h4>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold bg-emerald-500/15 text-emerald-500 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      LIVE
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400">Real-time streaming tracking logs of student & visitor interactions. Compliance-guaranteed (no persistent storage prior to consent).</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Filters */}
                <div className={`flex items-center gap-1 rounded-lg p-1 text-[10px] border ${
                  isDark ? 'bg-zinc-800/40 border-zinc-700/60' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  {['ALL', 'page_view', 'view_listing', 'search_query', 'checkout_funnel'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setLogFilter(filter)}
                      className={`px-2 py-1 rounded-md font-bold transition-all cursor-pointer ${
                        logFilter === filter 
                          ? 'bg-[#2E75B6] text-white shadow-xs' 
                          : (isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-zinc-800')
                      }`}
                    >
                      {filter === 'ALL' ? 'All Events' : filter.replace('_', ' ')}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    (window as any)._lodga_analytics_events = [];
                    setAnalyticsLogs([]);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                    isDark 
                      ? 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-300' 
                      : 'bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-700'
                  }`}
                  title="Purge Sandbox Buffer Log"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  Clear Stream
                </button>
              </div>
            </div>

            {/* Filtered logs lists */}
            {(() => {
              const filtered = analyticsLogs.filter((log: any) => logFilter === 'ALL' || log.event === logFilter);
              
              if (filtered.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed rounded-xl border-zinc-200/40 font-sans">
                    <Activity className="w-8 h-8 text-zinc-350 animate-pulse mb-2" />
                    <strong className={`text-xs font-bold ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                      No Stream Activity Logged Yet
                    </strong>
                    <p className="text-[10px] text-zinc-450 max-w-sm mt-1">
                      Start browsing student listings, toggle search parameters, or accept the cookie consent banner in the student device to stream live events here!
                    </p>
                  </div>
                );
              }

              return (
                <div className={`rounded-xl border font-mono text-[11px] overflow-hidden ${
                  isDark ? 'bg-zinc-950 border-zinc-800/80' : 'bg-zinc-50/60 border-zinc-200/80'
                }`}>
                  <div className="max-h-[350px] overflow-y-auto divide-y divide-zinc-200/10">
                    {filtered.slice().reverse().map((log: any, index: number) => {
                      const getEventBadgeClass = (ev: string) => {
                        switch (ev) {
                          case 'page_view': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
                          case 'view_listing': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
                          case 'search_query': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                          case 'checkout_funnel': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                          default: return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
                        }
                      };

                      const formatHumanDescription = (ev: string, params: any) => {
                        try {
                          switch (ev) {
                            case 'page_view':
                              return `Navigated to screen: "${params?.screen_name || 'Home'}"`;
                            case 'view_listing':
                              return `Opened lodge: ${params?.property_id} in ${params?.zone || 'Unknown Zone'} @ ₦${Number(params?.price || 0).toLocaleString()}/year`;
                            case 'search_query':
                              const filtersStr = Object.entries(params || {})
                                .filter(([_, v]) => v !== undefined && v !== '')
                                .map(([k, v]) => `${k}=${v}`)
                                .join(', ');
                              return `Filtered listings by: { ${filtersStr || 'No active filters'} }`;
                            case 'checkout_funnel':
                              return `Proceeded with checkout step ${params?.step || 1}: "${params?.step_name || 'Review'}" (${params?.action || 'enter'})`;
                            case 'session_start':
                              return 'New session initialized & compliance check succeeded';
                            case 'session_duration':
                              return `Session active duration checked: ${params?.duration_seconds}s`;
                            default:
                              return `Triggered custom interaction event [${ev}]`;
                          }
                        } catch (e) {
                          return `Triggered event [${ev}]`;
                        }
                      };

                      return (
                        <div 
                          key={index} 
                          className={`p-3 flex flex-col md:flex-row md:items-center justify-between gap-2.5 transition-colors ${
                            isDark ? 'hover:bg-zinc-900/60' : 'hover:bg-zinc-100/60'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            {/* Timestamp */}
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 shrink-0 font-sans mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                            </div>

                            {/* Badge */}
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${getEventBadgeClass(log.event)}`}>
                              {log.event}
                            </span>

                            {/* Description */}
                            <span className={`text-[11.5px] font-medium leading-relaxed truncate ${
                              isDark ? 'text-zinc-200' : 'text-zinc-800'
                            }`}>
                              {formatHumanDescription(log.event, log.params)}
                            </span>
                          </div>

                          {/* Raw inspector */}
                          <div className="flex items-center gap-2 shrink-0 md:pl-2 font-sans">
                            <span className="text-[9px] text-zinc-400 font-sans uppercase">Params:</span>
                            <span className={`px-2 py-0.5 rounded text-[9.5px] max-w-[200px] truncate ${
                              isDark ? 'bg-zinc-900 text-emerald-400' : 'bg-zinc-100 text-emerald-700'
                            }`} title={JSON.stringify(log.params)}>
                              {JSON.stringify(log.params)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={`p-2 px-3 text-[10px] border-t flex justify-between items-center ${
                    isDark ? 'bg-zinc-900/30 border-zinc-800 text-zinc-500' : 'bg-zinc-100/40 border-zinc-200 text-zinc-500'
                  }`}>
                    <span>Showing {filtered.length} stream log events</span>
                    <span className="font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      Listening on Window Channel
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ==================================== */}
      {/* 5. CUSTOMER SAFETY & INTEGRITY REPORTS */}
      {/* ==================================== */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-extrabold uppercase tracking-wider text-red-500">Lodged Customer Safety & Integrity Reports</h4>
              <p className="text-[10px] text-zinc-500 font-medium">Verify complaints, review evidence attachments, and audit the caretakers or landlords in charge.</p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={downloadCustomerReportsPDF}
                className={`text-[10px] border px-2.5 py-1.5 rounded flex items-center gap-1.5 cursor-pointer transition font-bold ${
                  isDark ? 'bg-emerald-900/30 border-emerald-850 text-emerald-300 hover:bg-emerald-900/50' : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Download className="w-3 h-3" /> Download PDF Reports
              </button>
              <button 
                onClick={fetchReports} 
                className={`text-[10px] border px-2.5 py-1.5 rounded flex items-center gap-1 cursor-pointer transition ${
                  isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850' : 'bg-white border-zinc-250 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <RefreshCw className={`w-3 h-3 ${loadingReports ? 'animate-spin' : ''}`} /> Refresh Reports
              </button>
            </div>
          </div>

          {loadingReports ? (
            <div className="text-center py-12 text-zinc-500 text-xs animate-pulse">
              Retrieving confidential safety ledger from secure DB cluster...
            </div>
          ) : reportsList.length === 0 ? (
            <div className={`p-12 text-center rounded-2xl border ${isDark ? 'bg-zinc-900/40 border-zinc-800/80' : 'bg-zinc-50/60 border-zinc-200/80'}`}>
              <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <strong className="text-xs font-bold block">No Customer Reports Lodged</strong>
              <p className="text-[10px] text-zinc-500 max-w-sm mx-auto mt-1">
                Zero security escalations, suspicious caretakers, or listing mismatch reports have been filed. Strict physical audit verification gates are operating within margins.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reportsList.map((report: any) => {
                const isEditing = updatingReportId === report.report_id;
                const statusColors: Record<string, string> = {
                  'Pending': 'bg-amber-100 text-amber-800 border-amber-200',
                  'Under Review': 'bg-blue-100 text-blue-800 border-blue-200',
                  'Resolved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  'Dismissed': 'bg-zinc-100 text-zinc-650 border-zinc-200'
                };

                return (
                  <div 
                    key={report.report_id} 
                    className={`p-5 rounded-2xl border transition-all ${
                      isDark 
                        ? 'bg-[#1E1E1D] border-[#383837] text-[#E2E1DA]' 
                        : 'bg-white border-zinc-200 text-[#1A1A1A] shadow-xs'
                    }`}
                  >
                    {/* Top Row: Report ID, Type, Status */}
                    <div className="flex flex-wrap justify-between items-start gap-2 border-b border-zinc-200/40 pb-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-red-500">{report.report_id}</span>
                          <span className={`px-2.5 py-0.5 rounded text-[8px] font-bold uppercase border ${statusColors[report.status] || 'bg-zinc-100'}`}>
                            {report.status}
                          </span>
                        </div>
                        <h5 className="text-xs font-extrabold mt-1 text-[#1A1A1A] dark:text-[#E2E1DA]">Type: {report.report_type}</h5>
                      </div>
                      <span className="text-[10px] text-zinc-400 font-mono">
                        {report.created_at ? new Date(report.created_at).toLocaleString() : 'N/A'}
                      </span>
                    </div>

                    {/* Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Side: Report Details & Reporter */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Reporter (Student Info)</span>
                          {report.reporter ? (
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl text-xs space-y-1 border border-zinc-200/60">
                              <p className="font-bold text-zinc-800 dark:text-zinc-200">{report.reporter.full_name}</p>
                              <p className="text-zinc-500 font-mono text-[11px]">{report.reporter.email} • {report.reporter.phone || 'No phone provided'}</p>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2.5 rounded-xl text-xs text-zinc-400 border border-zinc-200/60 font-mono">
                              Anonymous Reporter
                            </div>
                          )}
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Description of Incident</span>
                          <p className="text-xs bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl text-zinc-700 dark:text-zinc-300 leading-relaxed border border-zinc-200/60 whitespace-pre-wrap">
                            {report.description}
                          </p>
                        </div>

                        {report.evidence_urls && report.evidence_urls.length > 0 && (
                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Evidence Photos</span>
                            <div className="flex flex-wrap gap-2">
                              {report.evidence_urls.map((url: string, idx: number) => (
                                <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="relative block w-16 h-16 rounded-xl overflow-hidden border border-zinc-200 hover:opacity-85 transition">
                                  <img src={url} className="w-full h-full object-cover" alt="Evidence attachment" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Side: Landlord, Caretaker & Listing in Charge */}
                      <div className="space-y-4">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Landlord / Caretaker In Charge</span>
                          {report.subjectContact ? (
                            <div className="bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 p-3.5 rounded-xl text-xs space-y-1.5">
                              <div className="flex justify-between items-center border-b border-amber-100/60 dark:border-amber-900/20 pb-1">
                                <strong className="text-amber-900 dark:text-amber-400 font-bold">{report.subjectContact.full_name}</strong>
                                <span className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                                  {report.subjectContact.contact_type}
                                </span>
                              </div>
                              <div className="text-zinc-650 dark:text-zinc-300 space-y-0.5 font-sans">
                                <p>📱 Phone: <strong className="font-mono text-zinc-800 dark:text-zinc-200">{report.subjectContact.phone}</strong></p>
                                {report.subjectContact.whatsapp && (
                                  <p>💬 WhatsApp: <strong className="font-mono text-zinc-800 dark:text-zinc-200">+{report.subjectContact.whatsapp}</strong></p>
                                )}
                                <p>📍 Service Zone: <strong className="text-zinc-850 dark:text-zinc-200">{report.subjectContact.zone}</strong></p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3 rounded-xl text-xs text-zinc-400 border border-zinc-200/60">
                              No specific contact registered as subject. Please review description.
                            </div>
                          )}
                        </div>

                        {report.subjectProperty && (
                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Associated Property / Lodge Details</span>
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded-xl text-xs border border-zinc-200/60 space-y-1.5">
                              <p className="font-bold text-zinc-850 dark:text-zinc-200">Lodge ID: <span className="font-mono text-zinc-900 dark:text-zinc-300">{report.subjectProperty.property_id}</span></p>
                              <div className="text-zinc-600 dark:text-zinc-400 space-y-0.5 text-[11px] font-sans">
                                <p>📍 Address: <span className="text-zinc-800 dark:text-zinc-200 font-medium">{report.subjectProperty.street_landmark}, {report.subjectProperty.zone}</span></p>
                                <p>🏠 Type: <span className="text-zinc-800 dark:text-zinc-200 font-medium">{report.subjectProperty.property_type} ({report.subjectProperty.bedrooms} Bed)</span></p>
                                <p>💰 Advertised Rent: <strong className="text-zinc-900 dark:text-zinc-100 font-bold">₦{Number(report.subjectProperty.landlord_rent).toLocaleString()}/year</strong></p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Panel for Status Updates */}
                        <div className="border-t border-zinc-200/40 pt-4 mt-2">
                          {!isEditing ? (
                            <div className="flex flex-wrap justify-between items-center gap-2">
                              {report.admin_notes && (
                                <div className="text-[11px] text-zinc-500 italic max-w-xs truncate" title={report.admin_notes}>
                                  <strong>Admin note:</strong> {report.admin_notes}
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setUpdatingReportId(report.report_id);
                                  setUpdatingStatus(report.status);
                                  setUpdatingNotes(report.admin_notes || '');
                                }}
                                className="ml-auto bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-[#E2E1DA] dark:text-[#1A1A1A] dark:hover:bg-[#E2E1DA]/80 font-bold px-3 py-1.5 rounded-lg text-[10px] cursor-pointer transition shadow-xs"
                              >
                                Manage Incident Status
                              </button>
                            </div>
                          ) : (
                            <div className="bg-zinc-50 dark:bg-[#1A1A1A] border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-3">
                              <strong className="text-[11px] block text-zinc-700 dark:text-zinc-300">Update Compliance Status</strong>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Status</label>
                                  <select 
                                    value={updatingStatus}
                                    onChange={(e) => setUpdatingStatus(e.target.value)}
                                    className="w-full bg-white dark:bg-[#242423] border border-zinc-200 dark:border-[#383837] rounded-lg p-1.5 text-xs text-zinc-800 dark:text-white outline-none"
                                  >
                                    <option value="Pending">Pending</option>
                                    <option value="Under Review">Under Review</option>
                                    <option value="Resolved">Resolved</option>
                                    <option value="Dismissed">Dismissed</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="text-[9px] uppercase font-bold text-zinc-400 block mb-1">Admin Resolution Notes</label>
                                  <textarea
                                    value={updatingNotes}
                                    onChange={(e) => setUpdatingNotes(e.target.value)}
                                    rows={2}
                                    className="w-full bg-white dark:bg-[#242423] border border-zinc-200 dark:border-[#383837] rounded-lg p-1.5 text-xs text-zinc-800 dark:text-white outline-none"
                                    placeholder="Enter action details..."
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 text-[10px]">
                                <button
                                  onClick={() => setUpdatingReportId(null)}
                                  className="border border-zinc-250 dark:border-[#383837] bg-white dark:bg-[#242423] hover:bg-zinc-50 text-zinc-700 dark:text-zinc-300 px-3 py-1.5 rounded-lg font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleUpdateReportStatus(report.report_id, updatingStatus, updatingNotes)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg font-bold cursor-pointer"
                                >
                                  Save Compliance Changes
                                </button>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
