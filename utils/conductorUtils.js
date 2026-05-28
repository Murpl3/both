import AsyncStorage from '@react-native-async-storage/async-storage';
// Supabase has been removed as a source of truth. Keep the local conductor utilities working by
// forcing any legacy Supabase calls to fail and fall back to local storage logic.
const supabase = {
  from() {
    throw new Error('Supabase disabled');
  },
};
import { getConductorByUsername } from '../data/conductors';

// Duty shift hours configuration
const DUTY_START_HOUR = 5;  // 5:00 AM
const DUTY_END_HOUR = 18;   // 6:00 PM

// After scheduled departure time + this many minutes, ticket is considered lapsed and auto-removed from pending
const LAPSED_GRACE_MINUTES = 5;
const LAPSED_GRACE_MS = LAPSED_GRACE_MINUTES * 60 * 1000;

/**
 * Get scheduled departure time in milliseconds (for comparison with Date.now()).
 * Uses departure_timestamp if present, otherwise parses schedule_time with today's date.
 * @param {object} t - Transaction with departureTimestamp/schedule or schedule_time
 * @returns {number|null} Unix ms or null if unknown
 */
const getDepartureTimeMs = (t) => {
  if (t.departureTimestamp != null) {
    const ts = Number(t.departureTimestamp);
    if (!Number.isNaN(ts)) return ts;
  }
  const scheduleStr = t.schedule || t.schedule_time || '';
  if (!scheduleStr) return null;
  const match = String(scheduleStr).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  const today = new Date();
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = (match[3] || '').toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  const dep = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes, 0, 0);
  return dep.getTime();
};

/** True if scheduled departure has passed (plus grace period) so ticket should be removed from pending */
const isTransactionLapsed = (t) => {
  const depMs = getDepartureTimeMs(t);
  if (depMs == null) return false; // unknown schedule → keep in list
  return Date.now() > depMs + LAPSED_GRACE_MS;
};

// Only show pending tickets whose departure is within this window (reduces noise across conductors)
const PENDING_WINDOW_START_MS = 30 * 60 * 1000;   // 30 min ago
const PENDING_WINDOW_END_MS = 24 * 60 * 60 * 1000; // 24 hours from now

/** True if transaction's departure is within the relevant window for conductor list */
const isWithinPendingWindow = (t) => {
  const depMs = getDepartureTimeMs(t);
  if (depMs == null) return true; // unknown → show
  const now = Date.now();
  return depMs >= now - PENDING_WINDOW_START_MS && depMs <= now + PENDING_WINDOW_END_MS;
};

/**
 * Get current shift info
 * @returns {object} Shift info with start/end times
 */
export const getCurrentShiftInfo = () => {
  const now = new Date();
  const shiftStart = new Date(now);
  shiftStart.setHours(DUTY_START_HOUR, 0, 0, 0);
  
  const shiftEnd = new Date(now);
  shiftEnd.setHours(DUTY_END_HOUR, 0, 0, 0);
  
  const isOnDuty = now >= shiftStart && now <= shiftEnd;
  const shiftDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
  
  return {
    shiftDate,
    shiftStart,
    shiftEnd,
    isOnDuty,
    dutyHours: `${DUTY_START_HOUR}:00 AM - ${DUTY_END_HOUR > 12 ? DUTY_END_HOUR - 12 : DUTY_END_HOUR}:00 ${DUTY_END_HOUR >= 12 ? 'PM' : 'AM'}`,
  };
};

/**
 * Get current conductor's vehicle number
 * @returns {Promise<number|null>} Vehicle number or null
 */
export const getConductorVehicleNo = async () => {
  try {
    const conductorDataJson = await AsyncStorage.getItem('conductor_data');
    if (conductorDataJson) {
      const conductorData = JSON.parse(conductorDataJson);
      // First try from stored data
      if (conductorData.vehicle_no) {
        return conductorData.vehicle_no;
      }
      // Then try from pre-defined list
      const predefined = getConductorByUsername(conductorData.username);
      if (predefined) {
        return predefined.vehicle_no;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting conductor vehicle:', error);
    return null;
  }
};

/**
 * Save accepted ticket to current shift
 * @param {object} ticketData - Ticket information
 * @returns {Promise<{success: boolean}>}
 */
export const saveAcceptedTicket = async (ticketData) => {
  try {
    const { shiftDate } = getCurrentShiftInfo();
    const vehicleNo = await getConductorVehicleNo();
    const shiftKey = `shift_tickets_${shiftDate}_vehicle_${vehicleNo || 'unknown'}`;
    
    // Get existing tickets for this shift
    const existingJson = await AsyncStorage.getItem(shiftKey);
    const existingTickets = existingJson ? JSON.parse(existingJson) : [];
    
    // Add new ticket with payment status and vehicle
    const newTicket = {
      ...ticketData,
      acceptedAt: new Date().toISOString(),
      paymentStatus: ticketData.paymentMode === 'CASH' ? 'PAID WITH CASH' : 'PAID WITH WALLET',
      shiftDate,
      vehicleNo: ticketData.vehicleNo || vehicleNo,
    };
    
    existingTickets.push(newTicket);
    await AsyncStorage.setItem(shiftKey, JSON.stringify(existingTickets));
    
    console.log(`✅ Ticket saved to shift ${shiftDate} (Vehicle #${vehicleNo}): ${ticketData.origin} → ${ticketData.destination}`);
    return { success: true };
  } catch (error) {
    console.error('Error saving accepted ticket:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Load all tickets for current shift (filtered by conductor's vehicle)
 * @param {string} specificDate - Optional specific date
 * @param {boolean} allVehicles - If true, load all vehicles (for admin view)
 * @returns {Promise<{success: boolean, tickets: array}>}
 */
export const loadShiftTickets = async (specificDate = null, allVehicles = false) => {
  try {
    const { shiftDate } = getCurrentShiftInfo();
    const targetDate = specificDate || shiftDate;
    const vehicleNo = await getConductorVehicleNo();
    
    // Load tickets for conductor's assigned vehicle only
    const shiftKey = `shift_tickets_${targetDate}_vehicle_${vehicleNo || 'unknown'}`;
    
    const ticketsJson = await AsyncStorage.getItem(shiftKey);
    const tickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    console.log(`📊 Loaded ${tickets.length} tickets for shift ${targetDate} (Vehicle #${vehicleNo})`);
    return { success: true, tickets, vehicleNo };
  } catch (error) {
    console.error('Error loading shift tickets:', error);
    return { success: false, tickets: [], error: error.message };
  }
};

/**
 * Get shift summary/statistics
 * @returns {Promise<object>} Shift statistics
 */
export const getShiftSummary = async (specificDate = null) => {
  try {
    const { shiftDate, dutyHours } = getCurrentShiftInfo();
    const targetDate = specificDate || shiftDate;
    const { tickets } = await loadShiftTickets(targetDate);
    
    let totalPassengers = 0;
    let cashTotal = 0;
    let walletTotal = 0;
    let regularCount = 0;
    let studentCount = 0;
    let pwdCount = 0;
    let rejectedCount = 0;
    
    tickets.forEach(ticket => {
      if (ticket.status === 'REJECTED') {
        rejectedCount++;
        return;
      }
      
      const passengers = parseInt(ticket.passengers) || 1;
      const amount = parseFloat(ticket.totalFare) || 0;
      
      totalPassengers += passengers;
      
      if (ticket.paymentMode === 'CASH') {
        cashTotal += amount;
      } else {
        walletTotal += amount;
      }
      
      // Count fare types - use individual counts if available
      if (ticket.regularCount !== undefined) {
        regularCount += parseInt(ticket.regularCount) || 0;
        studentCount += parseInt(ticket.studentCount) || 0;
        pwdCount += parseInt(ticket.pwdCount) || 0;
      } else if (ticket.fareType) {
        // Parse fareType string format: "1R/0S/0P"
        const fareMatch = ticket.fareType.match(/(\d+)R\/(\d+)S\/(\d+)P/);
        if (fareMatch) {
          regularCount += parseInt(fareMatch[1]) || 0;
          studentCount += parseInt(fareMatch[2]) || 0;
          pwdCount += parseInt(fareMatch[3]) || 0;
        } else if (ticket.fareType === 'Student') {
          studentCount += passengers;
        } else if (ticket.fareType === 'PWD') {
          pwdCount += passengers;
        } else {
          regularCount += passengers;
        }
      } else {
        regularCount += passengers;
      }
    });
    
    return {
      shiftDate: targetDate,
      dutyHours,
      totalTickets: tickets.length,
      totalPassengers,
      cashCollections: cashTotal,
      walletTransactions: walletTotal,
      totalRevenue: cashTotal + walletTotal,
      regularPassengers: regularCount,
      studentPassengers: studentCount,
      pwdPassengers: pwdCount,
      rejectedTickets: rejectedCount,
      tickets, // Include all tickets for PDF generation
    };
  } catch (error) {
    console.error('Error getting shift summary:', error);
    return {
      shiftDate: new Date().toISOString().split('T')[0],
      dutyHours: '5:00 AM - 6:00 PM',
      totalTickets: 0,
      totalPassengers: 0,
      cashCollections: 0,
      walletTransactions: 0,
      totalRevenue: 0,
      regularPassengers: 0,
      studentPassengers: 0,
      pwdPassengers: 0,
      rejectedTickets: 0,
      tickets: [],
    };
  }
};

/**
 * Clear current shift and archive it (per conductor/vehicle so all 10 conductors work correctly)
 * @returns {Promise<{success: boolean}>}
 */
export const endShiftAndStartNew = async () => {
  try {
    const { shiftDate } = getCurrentShiftInfo();
    const vehicleNo = await getConductorVehicleNo();
    const shiftKey = `shift_tickets_${shiftDate}_vehicle_${vehicleNo || 'unknown'}`;
    
    // Get current shift data before clearing
    const ticketsJson = await AsyncStorage.getItem(shiftKey);
    const tickets = ticketsJson ? JSON.parse(ticketsJson) : [];
    
    // Archive the shift data
    const archiveKey = `shift_archive_${shiftDate}_vehicle_${vehicleNo || 'unknown'}_${Date.now()}`;
    await AsyncStorage.setItem(archiveKey, JSON.stringify({
      shiftDate,
      vehicleNo,
      archivedAt: new Date().toISOString(),
      tickets,
    }));
    
    // Clear current shift for this conductor's vehicle
    await AsyncStorage.removeItem(shiftKey);
    
    // Clear trip data
    await AsyncStorage.removeItem('current_trip_data');
    
    console.log(`✅ Shift ${shiftDate} (Vehicle #${vehicleNo}) archived and cleared. Ready for new trip!`);
    return { success: true };
  } catch (error) {
    console.error('Error ending shift:', error);
    return { success: false, error: error.message };
  }
};

// Escape text for safe use in HTML to avoid breaking PDF generation
const escapeHtml = (str) => {
  if (str == null || str === '') return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const safeFormatTime = (dateVal) => {
  try {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString();
  } catch (_) {
    return '-';
  }
};

/**
 * Generate PDF content for shift report
 * @returns {Promise<string>} HTML content for PDF
 */
export const generateShiftReportHTML = async (conductorName, vehicleNo, driverNo) => {
  const summary = await getShiftSummary();
  const tickets = Array.isArray(summary.tickets) ? summary.tickets : [];
  
  const ticketRows = tickets.map((ticket, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(ticket.origin || '-')}</td>
      <td>${escapeHtml(ticket.destination || '-')}</td>
      <td>${ticket.passengers || 1}</td>
      <td>${escapeHtml(ticket.fareType || 'Regular')}</td>
      <td>₱${parseFloat(ticket.totalFare || 0).toFixed(2)}</td>
      <td style="color: ${ticket.paymentMode === 'CASH' ? '#28a745' : '#007bff'}">${escapeHtml(ticket.paymentStatus || '-')}</td>
      <td>${escapeHtml(safeFormatTime(ticket.acceptedAt))}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>EZ SAKAY - Trip Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #FF8C00, #FFD700); padding: 20px; border-radius: 10px; color: white; text-align: center; margin-bottom: 20px; }
        .header h1 { font-size: 28px; margin-bottom: 5px; }
        .header p { font-size: 14px; opacity: 0.9; }
        .info-card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .info-card h2 { color: #FF8C00; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #FF8C00; padding-bottom: 10px; }
        .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
        .info-label { color: #666; font-size: 13px; }
        .info-value { color: #333; font-weight: 600; font-size: 13px; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
        .summary-box { background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary-box.highlight { background: linear-gradient(135deg, #FF8C00, #FFD700); color: white; }
        .summary-box .value { font-size: 24px; font-weight: bold; }
        .summary-box .label { font-size: 11px; text-transform: uppercase; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        th { background: #FF8C00; color: white; padding: 12px 8px; font-size: 11px; text-transform: uppercase; }
        td { padding: 10px 8px; border-bottom: 1px solid #eee; font-size: 12px; text-align: center; }
        tr:last-child td { border-bottom: none; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { text-align: center; margin-top: 20px; color: #999; font-size: 12px; }
        .total-row { background: #FFD700 !important; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚌 EZ SAKAY</h1>
        <p>Daily Trip Report - DASUTRANSCO</p>
      </div>

      <div class="info-card">
        <h2>📋 Trip Information</h2>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${summary.shiftDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Duty Hours:</span>
          <span class="info-value">${summary.dutyHours}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Conductor Name:</span>
          <span class="info-value">${escapeHtml(conductorName || 'N/A')}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Vehicle No:</span>
          <span class="info-value">${vehicleNo ? `Vehicle #${escapeHtml(String(vehicleNo))}` : 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Driver No:</span>
          <span class="info-value">${driverNo ? `Driver #${escapeHtml(String(driverNo))}` : 'N/A'}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Route:</span>
          <span class="info-value">DIGOS CITY ↔ UPPER BALA</span>
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-box highlight">
          <div class="value">₱${summary.totalRevenue.toFixed(2)}</div>
          <div class="label">Total Revenue</div>
        </div>
        <div class="summary-box">
          <div class="value">${summary.totalPassengers}</div>
          <div class="label">Total Passengers</div>
        </div>
        <div class="summary-box">
          <div class="value">${summary.totalTickets}</div>
          <div class="label">Tickets Processed</div>
        </div>
        <div class="summary-box">
          <div class="value" style="color: #28a745;">₱${summary.cashCollections.toFixed(2)}</div>
          <div class="label">Cash Collections</div>
        </div>
        <div class="summary-box">
          <div class="value" style="color: #007bff;">₱${summary.walletTransactions.toFixed(2)}</div>
          <div class="label">Wallet Payments</div>
        </div>
        <div class="summary-box">
          <div class="value" style="color: #dc3545;">${summary.rejectedTickets}</div>
          <div class="label">Rejected</div>
        </div>
      </div>

      <div class="info-card">
        <h2>👥 Passenger Breakdown</h2>
        <div class="info-row">
          <span class="info-label">Regular Fare:</span>
          <span class="info-value">${summary.regularPassengers} passengers</span>
        </div>
        <div class="info-row">
          <span class="info-label">Student Fare:</span>
          <span class="info-value">${summary.studentPassengers} passengers</span>
        </div>
        <div class="info-row">
          <span class="info-label">PWD/Senior Fare:</span>
          <span class="info-value">${summary.pwdPassengers} passengers</span>
        </div>
      </div>

      <h2 style="color: #FF8C00; margin-bottom: 15px;">📝 Ticket Details</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>From</th>
            <th>To</th>
            <th>Pax</th>
            <th>Type</th>
            <th>Fare</th>
            <th>Payment</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${ticketRows || '<tr><td colspan="8" style="text-align:center;color:#999;">No tickets recorded</td></tr>'}
          <tr class="total-row">
            <td colspan="3">TOTAL</td>
            <td>${summary.totalPassengers}</td>
            <td>-</td>
            <td>₱${summary.totalRevenue.toFixed(2)}</td>
            <td colspan="2">-</td>
          </tr>
        </tbody>
      </table>

      <div class="footer">
        <p>Generated by EZ SAKAY App on ${new Date().toLocaleString()}</p>
        <p>© 2024 DASUTRANSCO - All Rights Reserved</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Load all active transactions (tickets) for the conductor to view
 * @returns {Promise<{success: boolean, transactions?: array, error?: string}>}
 */
export const loadAllActiveTransactions = async () => {
  try {
    const transactions = [];
    
    // Try loading from Supabase first
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: false });

      if (data && !error) {
        console.log(`✅ Loaded ${data.length} active transactions from Supabase`);
        
        // Convert to app format
        const formattedTransactions = data.map(t => ({
          id: t.id?.toString() || t.ref_no,
          refNo: t.ref_no,
          type: t.transaction_type,
          origin: t.origin,
          destination: t.destination,
          passengers: t.passengers || 1,
          schedule: t.schedule_time,
          operator: t.operator || 'DASUTRANSCO',
          status: t.status,
          amount: parseFloat(t.amount || 0),
          userPhone: t.user_phone,
          departureTimestamp: t.departure_timestamp,
          createdAt: t.created_at,
          passengerDetails: t.passenger_details || null,
        }));
        
        transactions.push(...formattedTransactions);
      }
    } catch (supabaseError) {
      console.log('ℹ️ Supabase not available, using local storage:', supabaseError.message);
    }

    // Also load from local storage as fallback
    try {
      const localTransactionsJson = await AsyncStorage.getItem('transactions');
      if (localTransactionsJson) {
        const localTransactions = JSON.parse(localTransactionsJson);
        const activeLocal = localTransactions.filter(t => t.status === 'ACTIVE');
        
        // Merge with Supabase data (avoid duplicates based on refNo)
        const existingRefNos = new Set(transactions.map(t => t.refNo));
        const uniqueLocal = activeLocal.filter(t => !existingRefNos.has(t.refNo));
        
        transactions.push(...uniqueLocal);
        console.log(`✅ Loaded ${uniqueLocal.length} additional transactions from local storage`);
      }
    } catch (localError) {
      console.log('⚠️ Error loading local transactions:', localError.message);
    }

    // Auto-remove lapsed pending: scheduled departure time has passed (+ grace period)
    const lapsed = transactions.filter(isTransactionLapsed);
    let stillActive = transactions.filter(t => !isTransactionLapsed(t));
    if (lapsed.length > 0) {
      console.log(`⏰ Auto-expiring ${lapsed.length} lapsed ticket(s) (departure time passed)`);
      await Promise.all(lapsed.map(t => updateTransactionStatus(t.refNo, 'EXPIRED')));
    }
    // Filter to relevant window only (departure within 30 min ago to 24h from now) so conductors see fewer irrelevant pendings
    stillActive = stillActive.filter(isWithinPendingWindow);

    return {
      success: true,
      transactions: stillActive.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return dateB - dateA; // Most recent first
      }),
    };
  } catch (error) {
    console.error('Error loading transactions for conductor:', error);
    return {
      success: false,
      error: error.message,
      transactions: [],
    };
  }
};

/**
 * Update transaction status (accept/reject ticket).
 * For USED: only updates if current status is ACTIVE (prevents race double-accept).
 * @param {string} transactionId - Transaction ID or refNo
 * @param {string} newStatus - New status (USED, REJECTED, etc.)
 * @returns {Promise<{success: boolean, alreadyUsed?: boolean, error?: string}>}
 */
export const updateTransactionStatus = async (transactionId, newStatus) => {
  try {
    let supabaseUpdated = false;
    if (newStatus === 'USED') {
      // Conditional update: only if still ACTIVE (so only one conductor can accept)
      const { data, error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('ref_no', transactionId)
        .eq('status', 'ACTIVE')
        .select('ref_no');

      if (!error && data && data.length > 0) {
        supabaseUpdated = true;
        console.log(`✅ Transaction ${transactionId} updated to USED in Supabase (conditional)`);
      } else if (!error && (!data || data.length === 0)) {
        console.log(`⚠️ Transaction ${transactionId} already USED/REJECTED in Supabase`);
        return { success: true, alreadyUsed: true };
      }
    }
    if (!supabaseUpdated && newStatus !== 'USED') {
      // REJECTED/EXPIRED etc.: normal update (no ACTIVE condition)
      try {
        const { error } = await supabase
          .from('transactions')
          .update({ status: newStatus })
          .eq('ref_no', transactionId);
        if (!error) console.log(`✅ Transaction ${transactionId} updated to ${newStatus} in Supabase`);
      } catch (e) {
        console.log('ℹ️ Supabase update failed:', e?.message);
      }
    }

    // Update in local storage
    const localTransactionsJson = await AsyncStorage.getItem('transactions');
    if (localTransactionsJson) {
      const localTransactions = JSON.parse(localTransactionsJson);
      const updatedTransactions = localTransactions.map(t => {
        if (t.refNo === transactionId || t.id === transactionId) {
          return { ...t, status: newStatus };
        }
        return t;
      });
      await AsyncStorage.setItem('transactions', JSON.stringify(updatedTransactions));
      console.log(`✅ Transaction ${transactionId} updated to ${newStatus} locally`);
    }

    return { success: true, alreadyUsed: false };
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get conductor statistics
 * @returns {Promise<{scannedToday: number, totalRevenue: number}>}
 */
export const getConductorStats = async () => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    let scannedToday = 0;
    let totalRevenue = 0;

    // Try Supabase first
    try {
      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('status', 'USED')
        .gte('created_at', todayStart.toISOString());

      if (data) {
        scannedToday = data.length;
        totalRevenue = data.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      }
    } catch (error) {
      console.log('Using local stats');
    }

    return { scannedToday, totalRevenue };
  } catch (error) {
    console.error('Error getting conductor stats:', error);
    return { scannedToday: 0, totalRevenue: 0 };
  }
};
