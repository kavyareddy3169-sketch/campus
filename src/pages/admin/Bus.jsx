import { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, setDoc, addDoc } from 'firebase/firestore';
import { 
  Search, 
  Bus, 
  Save, 
  Navigation, 
  IdCard, 
  Camera, 
  X, 
  CheckCircle, 
  AlertCircle, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  UserCheck,
  RefreshCw,
  Upload,
  Clock,
  ShieldCheck
} from 'lucide-react';
import Tesseract from 'tesseract.js';

const AdminBus = () => {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Full College ID Card OCR Scanner State
  const [showScanner, setShowScanner] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatusText, setOcrStatusText] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [manualStudentSelect, setManualStudentSelect] = useState('');

  // Camera Management
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraFacing, setCameraFacing] = useState('environment'); // 'environment' or 'user'
  const [hasCameraError, setHasCameraError] = useState(false);

  // Student Bus Assignment & ID Card Form
  const [form, setForm] = useState({
    assigned: false,
    busNumber: '',
    routeName: '',
    pickupLocation: '',
    stops: [],
    destinationName: '',
    feeAmount: 5000,
    feeStatus: 'unpaid',
    idCardRoll: '',
    idCardName: '',
    idCardDept: '',
    idCardYear: '',
    idCardVerified: false
  });

  // Global Bus Tracker Control (Status Only)
  const [busTracker, setBusTracker] = useState({
    busNumber: 'BUS-01',
    status: 'In Transit',
    speed: 45
  });
  const [trackingSaving, setTrackingSaving] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(docSnap => list.push({ id: docSnap.id, ...docSnap.data() }));
      setStudents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.studentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.idCard?.rollNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    const b = student.bus || {};
    const idCard = student.idCard || {};
    setForm({
      assigned: b.assigned || false,
      busNumber: b.busNumber || '',
      routeName: b.routeName || '',
      pickupLocation: b.pickupLocation || '',
      stops: b.stops || [],
      destinationName: b.destinationName || '',
      feeAmount: b.feeAmount || 5000,
      feeStatus: b.feeStatus || 'unpaid',
      idCardRoll: idCard.rollNumber || student.studentId || '',
      idCardName: idCard.name || student.name || '',
      idCardDept: idCard.department || student.department || '',
      idCardYear: idCard.academicYear || student.year || '',
      idCardVerified: !!student.idCardVerified
    });
  };

  const handleAddStop = () => {
    setForm(prev => ({ ...prev, stops: [...prev.stops, { name: '' }] }));
  };

  const handleStopChange = (index, value) => {
    const newStops = [...form.stops];
    newStops[index].name = value;
    setForm({ ...form, stops: newStops });
  };

  const handleRemoveStop = (index) => {
    const newStops = [...form.stops];
    newStops.splice(index, 1);
    setForm({ ...form, stops: newStops });
  };

  const handleSaveStudentBus = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);

    try {
      const updatedBus = { 
        assigned: form.assigned,
        busNumber: form.busNumber,
        routeName: form.routeName,
        pickupLocation: form.pickupLocation,
        stops: form.stops.filter(s => s.name && s.name.trim() !== ''),
        destinationName: form.destinationName,
        feeAmount: Number(form.feeAmount), 
        feeStatus: form.feeStatus 
      };

      const updatedIdCard = {
        rollNumber: form.idCardRoll.trim() || selectedStudent.studentId || '',
        name: form.idCardName.trim() || selectedStudent.name || '',
        department: form.idCardDept.trim() || selectedStudent.department || '',
        academicYear: form.idCardYear.trim() || selectedStudent.year || '',
        verifiedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'users', selectedStudent.id), { 
        bus: updatedBus,
        idCard: updatedIdCard,
        idCardVerified: true
      });

      const updatedStudent = { 
        ...selectedStudent, 
        bus: updatedBus,
        idCard: updatedIdCard,
        idCardVerified: true
      };
      setSelectedStudent(updatedStudent);
      setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      alert("Student ID card details and bus assignment verified and saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to update student profile");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTracker = async (e) => {
    e.preventDefault();
    if (!busTracker.busNumber) return;
    setTrackingSaving(true);

    try {
      const busRef = doc(db, 'buses', busTracker.busNumber);
      await setDoc(busRef, {
        busNumber: busTracker.busNumber,
        status: busTracker.status,
        speed: Number(busTracker.speed),
        lastUpdated: new Date().toISOString()
      }, { merge: true });
      
      alert(`Status updated for ${busTracker.busNumber}`);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setTrackingSaving(false);
    }
  };

  // --- CAMERA MANAGEMENT FOR FULL ID CARD SCANNING ---
  const startCamera = async (facing = cameraFacing) => {
    stopCamera();
    setHasCameraError(false);
    try {
      const constraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.warn("Camera access failed or unavailable:", err);
      setHasCameraError(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(nextFacing);
    startCamera(nextFacing);
  };

  useEffect(() => {
    if (showScanner && !scanResult && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showScanner, scanResult, capturedImage]);

  // Capture Image from Webcam/Mobile Video
  const handleCaptureFromCamera = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
    processIDCardOCR(dataUrl);
  };

  // Upload Photo Option
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setCapturedImage(dataUrl);
      stopCamera();
      processIDCardOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // --- OCR PARSING & MATCHING LOGIC ---
  const processIDCardOCR = async (imageSrc) => {
    setIsCapturing(true);
    setOcrProgress(5);
    setOcrStatusText('Initializing Optical Character Recognition (OCR)...');

    try {
      const result = await Tesseract.recognize(
        imageSrc,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const progressPct = Math.round((m.progress || 0) * 100);
              setOcrProgress(progressPct);
              setOcrStatusText(`Reading printed text from ID card (${progressPct}%)...`);
            }
          }
        }
      );

      const rawText = result.data.text || '';
      console.log("Captured ID Card OCR Text:", rawText);

      setOcrStatusText('Analyzing extracted student details...');
      
      const parsedData = extractDetailsFromOCR(rawText);
      await matchStudentAndVerifyBoarding(parsedData, rawText);

    } catch (err) {
      console.error("OCR process error:", err);
      alert("Failed to read ID card image. Please ensure the card is clear and well lit.");
      setCapturedImage(null);
    } finally {
      setIsCapturing(false);
      setOcrProgress(0);
      setOcrStatusText('');
    }
  };

  // Extract Roll Number, Name, Department from raw OCR text
  const extractDetailsFromOCR = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    let rollNumber = null;
    let studentName = null;
    let department = null;
    let academicYear = null;

    // Roll Number Search (Supports JNTU Anantapur, ALITS, and Standard Roll No patterns)
    const rollRegex = /\b([0-9]{2}[A-Z0-9]{2}[0-9A-Z]{1}[0-9A-Z]{1}[0-9A-Z]{4})\b/i;
    const rollLabelRegex = /(?:roll|reg(?:istration)?|ht|hall\s*ticket|adm(?:ission)?|pin|id|st(?:udent)?\s*id)\s*(?:no\.?|num(?:ber)?|#)?\s*[:\-\.]?\s*([A-Z0-9\-\/]{4,15})/i;

    for (const line of lines) {
      const labelMatch = line.match(rollLabelRegex);
      if (labelMatch && labelMatch[1]) {
        rollNumber = labelMatch[1].trim();
        break;
      }
      const genericMatch = line.match(rollRegex);
      if (genericMatch && genericMatch[1]) {
        rollNumber = genericMatch[1].trim();
        break;
      }
    }

    // Department Search
    const deptRegex = /\b(CSE|ECE|EEE|MECH|CIVIL|IT|AI\s*&\s*DS|AIML|Computer\s*Science|Electronics|Electrical|Mechanical)\b/i;
    for (const line of lines) {
      const match = line.match(deptRegex);
      if (match) {
        department = match[0].toUpperCase();
        break;
      }
    }

    // Academic Year Search
    const yearRegex = /\b(I|II|III|IV|1st|2nd|3rd|4th)\s*(?:Year|\/|Yr)?\b/i;
    for (const line of lines) {
      const match = line.match(yearRegex);
      if (match) {
        academicYear = match[0];
        break;
      }
    }

    // Student Name Search
    const nameLabelRegex = /(?:name|student\s*name)\s*[:\-\.]?\s*([A-Za-z\s\.]{3,30})/i;
    for (const line of lines) {
      const match = line.match(nameLabelRegex);
      if (match && match[1]) {
        studentName = match[1].trim();
        break;
      }
    }

    if (!studentName) {
      const excludedWords = ['ananda', 'anantha', 'lakshmi', 'institute', 'technology', 'sciences', 'alits', 'identity', 'card', 'student', 'college', 'campus'];
      for (const line of lines) {
        const lower = line.toLowerCase();
        const hasExcluded = excludedWords.some(w => lower.includes(w));
        const isAlpha = /^[A-Z\s\.]{3,30}$/i.test(line);
        if (!hasExcluded && isAlpha && line.length >= 3 && line !== rollNumber) {
          studentName = line.trim();
          break;
        }
      }
    }

    return { rollNumber, studentName, department, academicYear, rawLines: lines };
  };

  // Match against Firestore students
  const matchStudentAndVerifyBoarding = async (parsed, fullRawText) => {
    let matched = null;

    if (parsed.rollNumber) {
      const cleanRoll = parsed.rollNumber.toLowerCase().replace(/[^a-z0-9]/g, '');
      matched = students.find(s => {
        const sRoll = (s.studentId || s.rollNumber || s.idCard?.rollNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return sRoll && (sRoll === cleanRoll || cleanRoll.includes(sRoll) || sRoll.includes(cleanRoll));
      });
    }

    if (!matched && parsed.studentName) {
      const cleanName = parsed.studentName.toLowerCase().trim();
      matched = students.find(s => {
        const sName = (s.name || s.idCard?.name || '').toLowerCase().trim();
        return sName && (sName === cleanName || sName.includes(cleanName) || cleanName.includes(sName));
      });
    }

    if (!matched) {
      const lowerRaw = fullRawText.toLowerCase();
      matched = students.find(s => {
        const sRoll = (s.studentId || s.rollNumber || '').toLowerCase().trim();
        const sName = (s.name || '').toLowerCase().trim();
        return (sRoll && sRoll.length >= 4 && lowerRaw.includes(sRoll)) || 
               (sName && sName.length >= 4 && lowerRaw.includes(sName));
      });
    }

    if (!matched) {
      setScanResult({
        entryStatus: 'NOT_FOUND',
        extracted: parsed,
        rawText: fullRawText,
        message: 'Student Record Not Found'
      });
      return;
    }

    await executeBoardingVerification(matched, parsed, fullRawText);
  };

  // Execute Boarding Verification & Save to Firestore
  const executeBoardingVerification = async (student, parsed = {}, rawText = '') => {
    const busInfo = student.bus || {};
    const isAssigned = !!busInfo.assigned;
    const isPaid = (busInfo.feeStatus || '').toLowerCase() === 'paid';
    const todayDateStr = new Date().toISOString().split('T')[0];

    // Auto-link ID card in Firestore if not already linked
    try {
      const idCardToLink = {
        rollNumber: parsed.rollNumber || student.studentId || '',
        name: parsed.studentName || student.name || '',
        department: parsed.department || student.department || '',
        academicYear: parsed.academicYear || student.year || '',
        verifiedAt: new Date().toISOString()
      };
      await updateDoc(doc(db, 'users', student.id), {
        idCardVerified: true,
        idCard: idCardToLink
      });
    } catch (e) {
      console.warn("Auto-linking ID card note:", e);
    }

    let alreadyBoarded = false;
    let priorBoardingTime = '';
    try {
      const qDup = query(
        collection(db, 'busScans'), 
        where('studentUid', '==', student.id),
        where('date', '==', todayDateStr)
      );
      const dupSnap = await getDocs(qDup);
      if (!dupSnap.empty) {
        alreadyBoarded = true;
        priorBoardingTime = dupSnap.docs[0].data()?.time || '';
      }
    } catch (e) {
      console.warn("Duplicate check query note:", e);
    }

    if (isAssigned && isPaid) {
      if (alreadyBoarded) {
        setScanResult({
          entryStatus: 'ALREADY_BOARDED',
          student,
          extracted: parsed,
          priorTime: priorBoardingTime,
          message: `Already Boarded Today at ${priorBoardingTime}. Duplicate prevented.`
        });
        return;
      }

      const now = new Date();
      const boardingRecord = {
        studentId: student.studentId || student.rollNumber || '',
        studentUid: student.id || '',
        name: student.name || '',
        rollNumber: student.studentId || student.rollNumber || '',
        busNumber: busInfo.busNumber || '',
        route: busInfo.routeName || '',
        pickupLocation: busInfo.pickupLocation || '',
        destinationName: busInfo.destinationName || '',
        department: student.department || parsed.department || '',
        year: student.year || parsed.academicYear || '',
        feeStatus: 'paid',
        date: todayDateStr,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        boardingStatus: 'ALLOWED',
        scannedAt: now.toISOString()
      };

      try {
        await addDoc(collection(db, 'busScans'), boardingRecord);
        await addDoc(collection(db, 'boardingRecords'), boardingRecord);
        
        setScanResult({
          entryStatus: 'ALLOWED',
          student,
          extracted: parsed,
          boardingRecord,
          message: 'BOARDING SUCCESSFUL'
        });
      } catch (err) {
        console.error("Firebase write error:", err);
        const localScans = JSON.parse(localStorage.getItem('busScans') || '[]');
        localScans.push(boardingRecord);
        localStorage.setItem('busScans', JSON.stringify(localScans));

        setScanResult({
          entryStatus: 'ALLOWED',
          student,
          extracted: parsed,
          boardingRecord,
          message: 'BOARDING SUCCESSFUL (Saved Locally)'
        });
      }

    } else if (isAssigned && !isPaid) {
      const now = new Date();
      const deniedRecord = {
        studentId: student.studentId || '',
        studentUid: student.id || '',
        name: student.name || '',
        rollNumber: student.studentId || '',
        busNumber: busInfo.busNumber || '',
        route: busInfo.routeName || '',
        pickupLocation: busInfo.pickupLocation || '',
        destinationName: busInfo.destinationName || '',
        department: student.department || '',
        year: student.year || '',
        feeStatus: busInfo.feeStatus || 'unpaid',
        date: todayDateStr,
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        boardingStatus: 'DENIED_PAYMENT_PENDING',
        scannedAt: now.toISOString()
      };

      try {
        await addDoc(collection(db, 'busScans'), deniedRecord);
      } catch (e) {
        console.warn("Could not log denied scan:", e);
      }

      setScanResult({
        entryStatus: 'DENIED_PAYMENT',
        student,
        extracted: parsed,
        message: 'BOARDING DENIED — PAYMENT PENDING'
      });

    } else {
      setScanResult({
        entryStatus: 'DENIED_UNASSIGNED',
        student,
        extracted: parsed,
        message: 'BOARDING DENIED — NO BUS ASSIGNED'
      });
    }
  };

  const handleConfirmManualStudent = async () => {
    if (!manualStudentSelect) return;
    const selected = students.find(s => s.id === manualStudentSelect);
    if (!selected) return;
    await executeBoardingVerification(selected, scanResult?.extracted || {});
  };

  const handleScanAgain = () => {
    setScanResult(null);
    setCapturedImage(null);
    setManualStudentSelect('');
  };

  const closeScanner = () => {
    stopCamera();
    setShowScanner(false);
    setScanResult(null);
    setCapturedImage(null);
    setManualStudentSelect('');
  };

  if (loading) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-6xl mx-auto animate-fade-in grid md:grid-cols-3 gap-6">
      
      {/* Sidebar: Student List */}
      <div className="card md:col-span-1 h-[calc(100vh-120px)] flex flex-col">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Bus className="text-primary" /> Select Student
        </h3>
        <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Search student or roll no..." 
            className="input pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {filteredStudents.map(student => (
            <div 
              key={student.id} 
              onClick={() => handleSelectStudent(student)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedStudent?.id === student.id ? 'bg-primary-light border-primary' : 'bg-gray-50 border-gray-200 hover:border-primary'}`}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-gray-900">{student.name}</div>
                {student.idCardVerified ? (
                  <span className="text-[10px] bg-success-bg text-success px-1.5 py-0.5 rounded font-bold border border-success">
                    ID VERIFIED
                  </span>
                ) : (
                  <span className="text-[10px] bg-warning-bg text-warning px-1.5 py-0.5 rounded font-bold border border-warning">
                    UNVERIFIED
                  </span>
                )}
              </div>
              <div className="text-sm flex justify-between mt-1">
                <span className="text-gray-500 font-mono">{student.studentId}</span>
                <span className={`font-semibold ${student.bus?.assigned ? 'text-primary' : 'text-gray-400'}`}>
                  {student.bus?.assigned ? student.bus.busNumber : 'No Bus'}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-0.5 flex justify-between">
                <span>{student.department || 'General'}</span>
                <span className={`font-medium ${student.bus?.feeStatus === 'paid' ? 'text-success' : 'text-danger'}`}>
                  {student.bus?.feeStatus?.toUpperCase() || 'UNPAID'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 space-y-6 overflow-y-auto h-[calc(100vh-120px)] pr-2">
        
        {/* Main Panel: Student Assignment & ID Card Registration */}
        <div className="card">
          {!selectedStudent ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-400 text-center">
              <Bus size={48} className="mb-4 text-gray-300" />
              <p>Select a student to manage their bus assignment & register their physical ID card.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveStudentBus}>
              <div className="border-b pb-4 mb-6 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold">{selectedStudent.name}</h2>
                  <p className="text-gray-500 font-mono">{selectedStudent.studentId} • Transport Profile</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setShowScanner(true);
                    setScanResult(null);
                    setCapturedImage(null);
                  }}
                  className="btn btn-outline text-xs flex items-center gap-1.5"
                >
                  <Camera size={14} /> Scan ID Card (OCR)
                </button>
              </div>

              {/* ID Card Registration Section */}
              <div className="mb-6 p-4 rounded-xl border border-primary bg-primary-light bg-opacity-20">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2 text-sm">
                    <ShieldCheck size={18} className="text-primary" /> Registered Physical College ID Card Details
                  </h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${selectedStudent.idCardVerified ? 'bg-success text-white' : 'bg-warning text-gray-900'}`}>
                    {selectedStudent.idCardVerified ? 'Verified & Linked' : 'Verification Required'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold block mb-1">ID Card Roll No</label>
                    <input 
                      type="text" 
                      className="input bg-white text-sm py-1.5 font-mono" 
                      value={form.idCardRoll} 
                      onChange={e => setForm({...form, idCardRoll: e.target.value})} 
                      placeholder="e.g. 20731A0501" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold block mb-1">Name on ID Card</label>
                    <input 
                      type="text" 
                      className="input bg-white text-sm py-1.5" 
                      value={form.idCardName} 
                      onChange={e => setForm({...form, idCardName: e.target.value})} 
                      placeholder="Student Name" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold block mb-1">Department</label>
                    <input 
                      type="text" 
                      className="input bg-white text-sm py-1.5" 
                      value={form.idCardDept} 
                      onChange={e => setForm({...form, idCardDept: e.target.value})} 
                      placeholder="e.g. CSE / ECE" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold block mb-1">Academic Year</label>
                    <input 
                      type="text" 
                      className="input bg-white text-sm py-1.5" 
                      value={form.idCardYear} 
                      onChange={e => setForm({...form, idCardYear: e.target.value})} 
                      placeholder="e.g. III Year" 
                    />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-2">
                  * Students cannot see their bus route or tracking until their physical ID card matches this verified record.
                </p>
              </div>

              <div className="space-y-4">
                <div className="form-group flex items-center gap-2 mb-6">
                  <input type="checkbox" id="assigned" className="w-4 h-4 text-primary" checked={form.assigned} onChange={e => setForm({...form, assigned: e.target.checked})} />
                  <label htmlFor="assigned" className="font-bold mb-0 cursor-pointer text-gray-800">Assign Bus to Student</label>
                </div>

                {form.assigned && (
                  <div className="space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="col-span-2 font-bold text-gray-700 mb-2">Bus Assignment</h4>
                      <div className="form-group">
                        <label className="form-label">Bus Number / ID</label>
                        <input type="text" className="input bg-white" placeholder="e.g. BUS-01" value={form.busNumber} onChange={e => setForm({...form, busNumber: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Route Name</label>
                        <input type="text" className="input bg-white" placeholder="e.g. Route A" value={form.routeName} onChange={e => setForm({...form, routeName: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fee Amount (₹)</label>
                        <input type="number" className="input bg-white" min="0" value={form.feeAmount} onChange={e => setForm({...form, feeAmount: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Fee Status</label>
                        <select className="input bg-white" value={form.feeStatus} onChange={e => setForm({...form, feeStatus: e.target.value})}>
                          <option value="unpaid">Unpaid</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    </div>

                    {/* Routing Details (Names Only) */}
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <h4 className="font-bold text-gray-700 mb-4">Routing Details</h4>
                      
                      <div className="space-y-4">
                        <div className="form-group">
                          <label className="form-label">Pickup Location Name</label>
                          <input type="text" className="input bg-white" placeholder="e.g. Anantapur City Center" value={form.pickupLocation} onChange={e => setForm({...form, pickupLocation: e.target.value})} required />
                        </div>
                        
                        <div className="border-t border-b border-gray-200 py-4 my-2">
                          <div className="flex justify-between items-center mb-3">
                            <label className="form-label mb-0">Intermediate Stops (Optional)</label>
                            <button type="button" onClick={handleAddStop} className="btn btn-outline py-1 px-3 text-sm flex items-center gap-1">
                              <Plus size={14} /> Add Stop
                            </button>
                          </div>
                          
                          {form.stops.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No intermediate stops configured.</p>
                          ) : (
                            <div className="space-y-2">
                              {form.stops.map((stop, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                  <div className="bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shrink-0">{idx + 1}</div>
                                  <input 
                                    type="text" 
                                    className="input bg-white py-1.5" 
                                    placeholder="Stop Name" 
                                    value={stop.name} 
                                    onChange={e => handleStopChange(idx, e.target.value)} 
                                    required 
                                  />
                                  <button type="button" onClick={() => handleRemoveStop(idx)} className="text-danger p-2 hover:bg-danger-bg rounded">
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label className="form-label">Final Destination Name</label>
                          <input type="text" className="input bg-white" placeholder="e.g. Ananthalakshmi Institute" value={form.destinationName} onChange={e => setForm({...form, destinationName: e.target.value})} required />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t">
                <button type="submit" className="btn btn-primary flex items-center gap-2 px-6" disabled={saving}>
                  <Save size={18} /> {saving ? 'Saving...' : 'Save & Verify Profile'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Global Tracker Control & OCR ID Card Scanner Trigger */}
        <div className="card border-primary border">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                <Navigation /> Bus Status & OCR ID Card Boarding
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Scan physical College ID cards using OCR camera or update bus live route status.
              </p>
            </div>
            
            {/* FULL ID CARD SCANNING BUTTON */}
            <button 
              onClick={() => {
                setShowScanner(true);
                setScanResult(null);
                setCapturedImage(null);
              }}
              className="btn btn-secondary flex items-center gap-2 py-2 px-4 shadow-sm"
            >
              <IdCard size={20} /> Scan College ID Card
            </button>
          </div>

          <form onSubmit={handleUpdateTracker}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="form-group col-span-2">
                <label className="form-label">Target Bus ID</label>
                <input type="text" className="input" placeholder="e.g. BUS-01" value={busTracker.busNumber} onChange={e => setBusTracker({...busTracker, busNumber: e.target.value})} required />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Status Message</label>
                <input type="text" className="input" placeholder="e.g. On Route, Arrived, Offline" value={busTracker.status} onChange={e => setBusTracker({...busTracker, status: e.target.value})} required />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Speed (km/h)</label>
                <input type="number" className="input" value={busTracker.speed} onChange={e => setBusTracker({...busTracker, speed: e.target.value})} required />
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary bg-primary-dark" disabled={trackingSaving}>
                {trackingSaving ? 'Broadcasting...' : 'Broadcast Status Update'}
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* FULL PHYSICAL COLLEGE ID CARD OCR SCANNER MODAL */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <IdCard size={24} className="text-primary" />
                <div>
                  <h3 className="text-lg font-bold text-gray-800 leading-tight">College ID Card Scanner (OCR)</h3>
                  <p className="text-xs text-gray-500">Optical character recognition for physical student ID cards</p>
                </div>
              </div>
              <button onClick={closeScanner} className="text-gray-400 hover:text-gray-700 p-1">
                <X size={22} />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1">
              
              {!scanResult ? (
                <div className="space-y-4">
                  
                  {isCapturing ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                      <h4 className="text-lg font-bold text-gray-800 mb-1">Scanning ID Card...</h4>
                      <p className="text-sm text-gray-500 mb-3">{ocrStatusText}</p>
                      
                      {ocrProgress > 0 && (
                        <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-primary h-2.5 transition-all duration-200" style={{ width: `${ocrProgress}%` }}></div>
                        </div>
                      )}
                    </div>
                  ) : capturedImage ? (
                    <div className="flex flex-col items-center">
                      <div className="relative rounded-lg overflow-hidden border border-gray-300 max-h-72 mb-4 bg-black">
                        <img src={capturedImage} alt="Captured ID Card" className="object-contain w-full h-full" />
                      </div>
                      <button 
                        onClick={() => {
                          setCapturedImage(null);
                          startCamera();
                        }} 
                        className="btn btn-outline text-sm flex items-center gap-2"
                      >
                        <RefreshCw size={16} /> Retake Card Photo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative bg-black rounded-xl overflow-hidden min-h-[280px] flex items-center justify-center">
                        {hasCameraError ? (
                          <div className="p-6 text-center text-white">
                            <AlertCircle size={40} className="mx-auto mb-2 text-warning" />
                            <p className="font-bold text-sm mb-1">Camera Not Detected or Blocked</p>
                            <p className="text-xs text-gray-400 mb-4">Please grant camera permissions or upload an ID card photo directly.</p>
                          </div>
                        ) : (
                          <>
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover"
                            />
                            {/* Physical ID Card Alignment Guide Overlay */}
                            <div className="absolute inset-4 border-2 border-dashed border-white border-opacity-70 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
                              <span className="text-[11px] bg-black bg-opacity-60 text-white px-2 py-0.5 rounded uppercase tracking-wider font-semibold">
                                Align Physical ID Card Here
                              </span>
                              <span className="text-[11px] bg-black bg-opacity-60 text-white px-2 py-0.5 rounded">
                                Ensure Name & Roll No are visible
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {!hasCameraError && (
                          <button 
                            type="button" 
                            onClick={handleCaptureFromCamera}
                            className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md"
                          >
                            <Camera size={18} /> Capture & Scan ID Card
                          </button>
                        )}
                        
                        {!hasCameraError && (
                          <button 
                            type="button" 
                            onClick={toggleCameraFacing} 
                            className="btn btn-outline py-2.5 px-3" 
                            title="Switch Camera (Front/Back)"
                          >
                            <RefreshCw size={18} />
                          </button>
                        )}

                        <label className="btn btn-secondary py-2.5 px-4 flex items-center gap-2 cursor-pointer text-sm">
                          <Upload size={16} /> Upload Photo
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleImageUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>

                      <p className="text-center text-xs text-gray-500 pt-1">
                        Supports Ananda Lakshmi Institute (ALITS) & all standard physical college ID cards.
                      </p>
                    </div>
                  )}

                </div>
              ) : (
                <div className="py-2 flex flex-col items-stretch text-center">
                  
                  {scanResult.entryStatus === 'ALLOWED' && (
                    <div className="bg-success-bg border-2 border-success p-4 rounded-xl text-center mb-4">
                      <CheckCircle size={48} className="text-success mx-auto mb-1 animate-bounce" />
                      <h3 className="text-xl font-bold text-success">BOARDING SUCCESSFUL</h3>
                      <p className="text-xs text-gray-700 font-medium mt-1">
                        Student ID verified & linked in Firestore. Boarding recorded.
                      </p>
                      {scanResult.boardingRecord && (
                        <div className="mt-2 text-xs text-gray-500 flex justify-center items-center gap-3">
                          <span className="flex items-center gap-1"><Clock size={12} /> {scanResult.boardingRecord.time}</span>
                          <span>Bus: <strong className="text-gray-700">{scanResult.boardingRecord.busNumber}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {scanResult.entryStatus === 'ALREADY_BOARDED' && (
                    <div className="bg-warning-bg border border-warning p-4 rounded-xl text-center mb-4">
                      <Clock size={44} className="text-warning mx-auto mb-1" />
                      <h3 className="text-xl font-bold text-warning">ALREADY BOARDED TODAY</h3>
                      <p className="text-sm font-semibold text-gray-800 mt-1">
                        Boarding record already logged at {scanResult.priorTime || 'earlier today'}.
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Duplicate boarding record prevented for this student.</p>
                    </div>
                  )}

                  {scanResult.entryStatus === 'DENIED_PAYMENT' && (
                    <div className="bg-danger-bg border-2 border-danger p-4 rounded-xl text-center mb-4">
                      <AlertCircle size={48} className="text-danger mx-auto mb-1" />
                      <h3 className="text-xl font-bold text-danger">BOARDING DENIED</h3>
                      <p className="text-sm font-bold text-danger mt-1">
                        BUS FEE PAYMENT PENDING (Status: {scanResult.student?.bus?.feeStatus?.toUpperCase() || 'UNPAID'})
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        Student is registered for bus {scanResult.student?.bus?.busNumber}, but fee clearance is required.
                      </p>
                    </div>
                  )}

                  {scanResult.entryStatus === 'DENIED_UNASSIGNED' && (
                    <div className="bg-warning-bg border border-warning p-4 rounded-xl text-center mb-4">
                      <AlertCircle size={44} className="text-warning mx-auto mb-1" />
                      <h3 className="text-xl font-bold text-warning">NO BUS ASSIGNED</h3>
                      <p className="text-sm font-semibold text-warning mt-1">Student Not Assigned to Any Bus Route</p>
                    </div>
                  )}

                  {scanResult.entryStatus === 'NOT_FOUND' && (
                    <div className="space-y-4 mb-4">
                      <div className="bg-danger-bg border border-danger p-4 rounded-xl text-center">
                        <AlertTriangle size={44} className="text-danger mx-auto mb-1" />
                        <h3 className="text-xl font-bold text-danger">Student Record Not Found</h3>
                        <p className="text-xs text-gray-600 mt-1">
                          No matching student was found in Firestore for the scanned card.
                        </p>
                        {scanResult.extracted?.rollNumber && (
                          <p className="text-xs font-mono font-bold text-gray-800 mt-1 bg-white inline-block px-2 py-0.5 rounded border">
                            Detected Roll: {scanResult.extracted.rollNumber}
                          </p>
                        )}
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2 mb-1 text-sm">
                          <UserCheck size={16} className="text-primary" /> Confirm Registered Student
                        </h4>
                        <p className="text-xs text-gray-500 mb-3">
                          Select the matching student manually to verify bus status and log boarding:
                        </p>
                        
                        <div className="space-y-3">
                          <select 
                            value={manualStudentSelect} 
                            onChange={e => setManualStudentSelect(e.target.value)} 
                            className="input w-full text-sm bg-white"
                          >
                            <option value="">-- Select Student to Confirm --</option>
                            {students.map(s => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.studentId || s.id}) {s.department ? `- ${s.department}` : ''}
                              </option>
                            ))}
                          </select>

                          <button 
                            type="button"
                            onClick={handleConfirmManualStudent} 
                            disabled={!manualStudentSelect}
                            className="btn btn-primary w-full text-sm py-2"
                          >
                            Confirm Student & Record Boarding
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STUDENT REGISTERED INFORMATION GRID */}
                  {scanResult.student && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-left shadow-sm">
                      <h4 className="font-bold text-gray-800 border-b pb-2 mb-3 text-sm flex items-center justify-between">
                        <span>Student Registered Information</span>
                        <span className="text-xs font-mono text-gray-500 bg-white px-2 py-0.5 rounded border">
                          Roll: {scanResult.student.studentId || scanResult.student.id}
                        </span>
                      </h4>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <span className="text-xs text-gray-500 block">Student Name</span>
                          <strong className="text-gray-900">{scanResult.student.name || 'N/A'}</strong>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Roll Number</span>
                          <strong className="text-gray-900 font-mono">{scanResult.student.studentId || scanResult.student.id}</strong>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Department</span>
                          <span className="text-gray-800">{scanResult.student.department || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Academic Year</span>
                          <span className="text-gray-800">{scanResult.student.year || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Assigned Bus</span>
                          <strong className="text-primary">{scanResult.student.bus?.busNumber || 'None'}</strong>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500 block">Bus Fee Status</span>
                          <span className={`font-bold ${scanResult.student.bus?.feeStatus === 'paid' ? 'text-success' : 'text-danger'}`}>
                            {scanResult.student.bus?.feeStatus?.toUpperCase() || 'UNPAID'}
                          </span>
                        </div>
                        <div className="col-span-2 pt-1 border-t border-gray-200">
                          <span className="text-xs text-gray-500 block">Pickup Location</span>
                          <span className="text-gray-800 font-medium">{scanResult.student.bus?.pickupLocation || 'Not Assigned'}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-xs text-gray-500 block">Destination</span>
                          <span className="text-gray-800 font-medium">{scanResult.student.bus?.destinationName || 'Not Assigned'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleScanAgain}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-2.5 shadow-sm font-semibold"
                  >
                    <RefreshCw size={18} /> Scan Next ID Card
                  </button>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminBus;