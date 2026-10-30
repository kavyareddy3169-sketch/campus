import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, onSnapshot, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { 
  Bus as BusIcon, 
  Navigation, 
  AlertCircle, 
  Map as MapIcon, 
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Upload,
  RefreshCw,
  X,
  CheckCircle,
  Clock,
  IdCard,
  MapPin,
  Lock,
  Unlock
} from 'lucide-react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import Tesseract from 'tesseract.js';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = { lat: 17.3850, lng: 78.4867 };
const hasValidGoogleMapsKey = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY && import.meta.env.VITE_GOOGLE_MAPS_API_KEY.length > 5);

const StudentBus = () => {
  const { userData } = useAuth();
  const [liveBusData, setLiveBusData] = useState(null);

  // Security Gate: ID Card Verification state
  const [isIdVerified, setIsIdVerified] = useState(() => {
    if (!userData?.uid) return false;
    return sessionStorage.getItem(`bus_verified_${userData.uid}`) === 'true';
  });

  // OCR ID Scanner State
  const [showIdScanner, setShowIdScanner] = useState(false);
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [verificationSuccessToast, setVerificationSuccessToast] = useState(false);

  // Camera Management
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraFacing, setCameraFacing] = useState('environment');
  const [cameraError, setCameraError] = useState(false);

  // Google Maps State (Only loaded if a valid API key is explicitly configured)
  const { isLoaded: isMapLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: hasValidGoogleMapsKey ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : ''
  });
  const [directions, setDirections] = useState(null);

  const bus = userData?.bus || { 
    assigned: false, 
    routeName: '', 
    busNumber: '', 
    feeAmount: 0, 
    feeStatus: 'unpaid', 
    pickupLocation: '', 
    destinationName: '', 
    stops: [] 
  };

  // Subscribe to live bus status once student is ID-verified and assigned
  useEffect(() => {
    if (isIdVerified && bus.assigned && bus.busNumber) {
      const busRef = doc(db, 'buses', bus.busNumber);
      const unsubscribe = onSnapshot(busRef, (docSnap) => {
        if (docSnap.exists()) {
          setLiveBusData(docSnap.data());
        } else {
          setLiveBusData(null);
        }
      });
      return () => unsubscribe();
    }
  }, [isIdVerified, bus.assigned, bus.busNumber]);

  // Load directions if Google Maps API is active
  useEffect(() => {
    if (isIdVerified && hasValidGoogleMapsKey && isMapLoaded && window.google && bus.pickupLocation && bus.destinationName) {
      const directionsService = new window.google.maps.DirectionsService();
      const waypoints = (bus.stops || []).map(stop => ({
        location: { query: stop.name },
        stopover: true
      }));

      directionsService.route(
        {
          origin: { query: bus.pickupLocation },
          destination: { query: bus.destinationName },
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [isIdVerified, isMapLoaded, bus]);

  // --- CAMERA MANAGEMENT FOR STUDENT OCR SCAN ---
  const startCamera = async (facing = cameraFacing) => {
    stopCamera();
    setCameraError(false);
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
      console.warn("Camera access failed:", err);
      setCameraError(true);
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
    if (showIdScanner && !capturedImage) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [showIdScanner, capturedImage]);

  const handleCaptureCard = () => {
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
    performOCRVerification(dataUrl);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      setCapturedImage(dataUrl);
      stopCamera();
      performOCRVerification(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // --- OCR PARSING & LOGGED-IN STUDENT IDENTITY VERIFICATION ---
  const performOCRVerification = async (imageSrc) => {
    setIsOcrProcessing(true);
    setOcrProgress(5);
    setOcrStatus('Reading printed text on College ID Card...');
    setVerificationError('');

    try {
      const result = await Tesseract.recognize(
        imageSrc,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              const pct = Math.round((m.progress || 0) * 100);
              setOcrProgress(pct);
              setOcrStatus(`Extracting details from ID Card (${pct}%)...`);
            }
          }
        }
      );

      const rawText = result.data.text || '';
      console.log("Student Scanned ID Card Text:", rawText);

      // Parse details
      const parsed = parseStudentDetails(rawText);

      // Security check: Must belong to currently logged-in student
      const myRoll = (userData.studentId || userData.rollNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const myName = (userData.name || '').toLowerCase().trim();
      const extractedRoll = (parsed.rollNumber || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const extractedName = (parsed.studentName || '').toLowerCase().trim();
      const rawLower = rawText.toLowerCase();

      const rollMatch = myRoll && extractedRoll && (extractedRoll === myRoll || extractedRoll.includes(myRoll) || myRoll.includes(extractedRoll) || rawLower.includes(myRoll));
      const nameMatch = myName && (extractedName.includes(myName) || myName.includes(extractedName) || rawLower.includes(myName));

      if (!rollMatch && !nameMatch) {
        setVerificationError(
          `Verification Failed: Scanned ID card does not match your student profile (${userData.name} - ${userData.studentId}). You are only permitted to verify your own physical College ID card.`
        );
        return;
      }

      // Verified Successfully!
      setIsIdVerified(true);
      sessionStorage.setItem(`bus_verified_${userData.uid}`, 'true');
      setShowIdScanner(false);
      setCapturedImage(null);
      setVerificationSuccessToast(true);

      // Record successful verification event
      try {
        await addDoc(collection(db, 'idVerifications'), {
          studentUid: userData.uid,
          studentId: userData.studentId || '',
          name: userData.name || '',
          verifiedAt: new Date().toISOString(),
          busNumber: bus.busNumber || 'None'
        });
      } catch (e) {
        console.warn("Verification log note:", e);
      }

      setTimeout(() => setVerificationSuccessToast(false), 5000);

    } catch (err) {
      console.error("OCR error:", err);
      setVerificationError("Failed to process ID card image. Please ensure the card is clear and well lit, then try again.");
    } finally {
      setIsOcrProcessing(false);
      setOcrProgress(0);
      setOcrStatus('');
    }
  };

  const parseStudentDetails = (text) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    let rollNumber = null;
    let studentName = null;

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

    const nameLabelRegex = /(?:name|student\s*name)\s*[:\-\.]?\s*([A-Za-z\s\.]{3,30})/i;
    for (const line of lines) {
      const match = line.match(nameLabelRegex);
      if (match && match[1]) {
        studentName = match[1].trim();
        break;
      }
    }

    return { rollNumber, studentName };
  };

  const openGoogleMapsUrl = () => {
    if (!bus.pickupLocation || !bus.destinationName) {
      alert("Pickup or Destination is not properly configured.");
      return;
    }
    
    let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(bus.pickupLocation)}&destination=${encodeURIComponent(bus.destinationName)}`;
    
    if (bus.stops && bus.stops.length > 0) {
      const waypoints = bus.stops.map(s => encodeURIComponent(s.name)).join('|');
      url += `&waypoints=${waypoints}`;
    }
    
    window.open(url, '_blank');
  };

  if (!userData) return <div className="loader mx-auto mt-10"></div>;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Bus Management</h2>
          <p className="text-sm text-gray-500">Live campus transport security & route information</p>
        </div>

        {isIdVerified && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-success-bg text-success border border-success">
              <ShieldCheck size={14} /> ID Verified
            </span>
            <button 
              onClick={() => {
                sessionStorage.removeItem(`bus_verified_${userData.uid}`);
                setIsIdVerified(false);
              }}
              className="text-xs text-gray-500 hover:text-danger flex items-center gap-1 underline ml-2"
              title="Lock details and test ID scan again"
            >
              <Lock size={12} /> Lock Bus Details
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {verificationSuccessToast && (
        <div className="bg-success-bg border border-success text-success p-4 rounded-xl mb-6 flex items-center gap-3 animate-fade-in shadow-sm">
          <CheckCircle size={24} className="flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Physical College ID Card Verified!</h4>
            <p className="text-xs text-gray-700">
              Welcome, {userData.name}. Your assigned bus route details and live tracking have been unlocked.
            </p>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 1. LOCKED VIEW: VERIFY YOUR COLLEGE ID CARD FIRST                */}
      {/* ================================================================ */}
      {!isIdVerified ? (
        <div className="card text-center p-8 md:p-12 border-2 border-dashed border-gray-300 rounded-2xl bg-white shadow-sm max-w-2xl mx-auto">
          <div className="w-20 h-20 rounded-full bg-primary-light flex items-center justify-center text-primary mx-auto mb-4">
            <ShieldAlert size={44} />
          </div>
          
          <span className="text-xs uppercase tracking-wider font-bold bg-warning-bg text-warning px-3 py-1 rounded-full border border-warning inline-block mb-3">
            Identity Verification Required
          </span>

          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Verify Your College ID Card
          </h3>
          <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
            For campus safety and route security, bus assignments, pickup locations, and live tracking are hidden until you scan your physical College ID card.
          </p>

          {/* Student Account Card */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-left max-w-md mx-auto mb-6 text-sm">
            <div className="flex justify-between items-center border-b pb-2 mb-2">
              <span className="text-xs uppercase font-bold text-gray-500">Registered Student Account</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary-light text-primary">
                {userData.department || 'Student'}
              </span>
            </div>
            <p className="font-bold text-gray-900">{userData.name}</p>
            <p className="text-xs text-gray-500">
              Roll Number: <span className="font-mono font-medium text-gray-800">{userData.studentId || userData.rollNumber || 'N/A'}</span>
            </p>
            <p className="text-[11px] text-gray-400 mt-2 italic">
              * The scanned physical ID card must match this Roll Number and Name.
            </p>
          </div>

          {/* Trigger Scan Button */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
            <button 
              onClick={() => {
                setShowIdScanner(true);
                setCapturedImage(null);
                setVerificationError('');
              }}
              className="btn btn-primary py-3 px-6 flex items-center justify-center gap-2 font-bold shadow-md flex-1"
            >
              <Camera size={18} /> Open Camera & Scan ID Card
            </button>
            <label className="btn btn-secondary py-3 px-5 flex items-center justify-center gap-2 cursor-pointer text-sm">
              <Upload size={16} /> Upload ID Card Photo
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Supports physical College ID cards from Anantha Lakshmi Institute (ALITS) & all partner institutions.
          </p>
        </div>
      ) : (

        /* ================================================================ */
        /* 2. UNLOCKED VIEW: FULL BUS DETAILS & ROUTE TRACKING              */
        /* ================================================================ */
        <div className="space-y-6">
          
          {/* Check Case 1: No Bus Assigned */}
          {!bus.assigned ? (
            <div className="card text-center p-8 bg-gray-50 border border-gray-200 rounded-xl">
              <BusIcon size={48} className="mx-auto mb-3 text-gray-400" />
              <h3 className="text-xl font-bold text-gray-800 mb-1">No Bus Assigned</h3>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                You are not currently assigned to any college bus route. Please contact the campus transport coordinator to register for bus service.
              </p>
            </div>
          ) : (
            <>
              {/* Fee Status Warning if Unpaid */}
              {bus.feeStatus !== 'paid' ? (
                <div className="bg-danger-bg border border-danger text-danger p-4 rounded-xl flex items-start gap-3 shadow-sm">
                  <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm">Bus Fee Payment Pending</h4>
                    <p className="text-xs text-gray-700 mt-0.5">
                      Your bus fee of ₹{bus.feeAmount || 5000} is currently unpaid. Please complete your fee payment to maintain active boarding eligibility.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-success-bg border border-success text-success p-3 rounded-xl flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2">
                    <CheckCircle size={16} /> Bus Fee Paid — Active Student Pass
                  </span>
                  <span>Amount: ₹{bus.feeAmount || 5000}</span>
                </div>
              )}

              {/* Main Bus Route & Live Tracking Layout */}
              <div className="grid md:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Route Map View */}
                <div className="md:col-span-2 card p-4 flex flex-col">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm uppercase tracking-wide">
                      <Navigation size={18} className="text-primary" /> Route & Live Bus Location
                    </h3>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                      Bus ID: {bus.busNumber}
                    </span>
                  </div>

                  <div className="bg-gray-100 rounded-xl overflow-hidden h-80 relative flex flex-col items-center justify-center border border-gray-200">
                    {hasValidGoogleMapsKey && isMapLoaded ? (
                      <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={defaultCenter}
                        zoom={12}
                        options={{ disableDefaultUI: true, zoomControl: true }}
                      >
                        {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: false }} />}
                      </GoogleMap>
                    ) : (
                      /* Clean Interactive Route Visualizer (Always renders reliably without API key errors) */
                      <div className="w-full h-full p-6 flex flex-col justify-between bg-gradient-to-br from-slate-50 to-blue-50 relative">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
                            Live Route Track
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${liveBusData?.status ? 'bg-success-bg text-success' : 'bg-gray-200 text-gray-600'}`}>
                            {liveBusData?.status || 'Route Active'}
                          </span>
                        </div>

                        {/* Visual Route Path Line */}
                        <div className="space-y-4 my-auto px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow shrink-0">
                              A
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Pickup Location</p>
                              <p className="text-sm font-bold text-gray-900">{bus.pickupLocation || 'Pickup Point'}</p>
                            </div>
                          </div>

                          {bus.stops && bus.stops.length > 0 && (
                            <div className="pl-4 border-l-2 border-dashed border-primary ml-4 space-y-2 py-1">
                              {bus.stops.map((stop, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                                  <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                  <span>{stop.name}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-danger text-white flex items-center justify-center text-xs font-bold shadow shrink-0">
                              B
                            </div>
                            <div>
                              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Destination</p>
                              <p className="text-sm font-bold text-gray-900">{bus.destinationName || 'Campus Destination'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-gray-500 border-t pt-2">
                          <span>Route: <strong>{bus.routeName || 'Assigned Route'}</strong></span>
                          <span>Last Update: {liveBusData?.lastUpdated ? new Date(liveBusData.lastUpdated).toLocaleTimeString() : 'Current'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* View on Google Maps Button */}
                  <button 
                    onClick={openGoogleMapsUrl}
                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-3 mt-4 text-sm font-bold shadow-md"
                  >
                    <ExternalLink size={16} /> View Complete Route on Google Maps
                  </button>
                </div>

                {/* Right 1 Col: Assigned Bus Details Panel */}
                <div className="space-y-4">
                  <div className="card p-4">
                    <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                      <BusIcon size={16} className="text-primary" /> Assigned Bus Details
                    </h4>
                    
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Bus Number</span>
                        <strong className="text-gray-900 font-mono">{bus.busNumber}</strong>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Route Name</span>
                        <span className="font-medium text-gray-800">{bus.routeName}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-gray-500">Fee Status</span>
                        <span className={`font-bold ${bus.feeStatus === 'paid' ? 'text-success' : 'text-danger'}`}>
                          {bus.feeStatus?.toUpperCase() || 'UNPAID'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="card p-4">
                    <h4 className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-2">
                      <MapPin size={16} className="text-primary" /> Route Stops
                    </h4>
                    
                    <div className="space-y-3 text-sm">
                      <div>
                        <span className="text-xs uppercase text-gray-400 font-bold block">Pickup Location</span>
                        <span className="font-semibold text-gray-900">{bus.pickupLocation || 'Not Assigned'}</span>
                      </div>

                      {bus.stops && bus.stops.length > 0 && (
                        <div className="pl-3 border-l-2 border-primary space-y-1">
                          <span className="text-xs uppercase text-gray-400 font-bold block">Via Stops</span>
                          {bus.stops.map((s, idx) => (
                            <div key={idx} className="text-xs text-gray-700 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                              {s.name}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t">
                        <span className="text-xs uppercase text-gray-400 font-bold block">Destination</span>
                        <span className="font-semibold text-gray-900">{bus.destinationName || 'Not Assigned'}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </>
          )}

        </div>
      )}

      {/* ================================================================ */}
      {/* 3. FULL COLLEGE ID CARD OCR SCANNER MODAL (STUDENT SIDE)         */}
      {/* ================================================================ */}
      {showIdScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <div className="flex items-center gap-2">
                <IdCard size={22} className="text-primary" />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Verify Physical College ID Card</h3>
                  <p className="text-xs text-gray-500">Scan card to unlock your assigned bus details</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  stopCamera();
                  setShowIdScanner(false);
                }} 
                className="text-gray-400 hover:text-gray-700 p-1"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              {isOcrProcessing ? (
                <div className="py-12 text-center flex flex-col items-center">
                  <div className="w-14 h-14 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
                  <h4 className="font-bold text-gray-800 text-base mb-1">Verifying College ID Card...</h4>
                  <p className="text-xs text-gray-500 mb-3">{ocrStatus}</p>
                  {ocrProgress > 0 && (
                    <div className="w-full max-w-xs bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-primary h-2 transition-all duration-200" style={{ width: `${ocrProgress}%` }}></div>
                    </div>
                  )}
                </div>
              ) : capturedImage ? (
                <div className="space-y-4">
                  <div className="rounded-xl overflow-hidden border border-gray-300 max-h-64 bg-black flex items-center justify-center">
                    <img src={capturedImage} alt="Card preview" className="object-contain w-full h-full" />
                  </div>

                  {verificationError && (
                    <div className="bg-danger-bg border border-danger text-danger p-3 rounded-lg text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Verification Failed</strong>
                        <p className="mt-0.5">{verificationError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setCapturedImage(null);
                        setVerificationError('');
                        startCamera();
                      }}
                      className="btn btn-outline text-xs flex-1 flex items-center justify-center gap-1.5 py-2.5"
                    >
                      <RefreshCw size={14} /> Retake Card Photo
                    </button>
                    {verificationError && (
                      <button 
                        onClick={() => performOCRVerification(capturedImage)}
                        className="btn btn-primary text-xs flex-1 py-2.5"
                      >
                        Retry OCR
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-black rounded-xl overflow-hidden min-h-[260px] flex items-center justify-center">
                    {cameraError ? (
                      <div className="p-6 text-center text-white">
                        <AlertCircle size={36} className="mx-auto mb-2 text-warning" />
                        <p className="font-bold text-sm mb-1">Camera Unavailable</p>
                        <p className="text-xs text-gray-400 mb-3">Please grant camera permissions or upload an ID card photo.</p>
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
                        <div className="absolute inset-4 border-2 border-dashed border-white border-opacity-70 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
                          <span className="text-[11px] bg-black bg-opacity-60 text-white px-2 py-0.5 rounded font-semibold">
                            Position Physical ID Card Inside Box
                          </span>
                          <span className="text-[10px] bg-black bg-opacity-60 text-white px-2 py-0.5 rounded">
                            Ensure Roll No is clearly visible
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {verificationError && (
                    <div className="bg-danger-bg border border-danger text-danger p-3 rounded-lg text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                      <div>
                        <strong>Verification Failed</strong>
                        <p className="mt-0.5">{verificationError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!cameraError && (
                      <button 
                        type="button" 
                        onClick={handleCaptureCard}
                        className="btn btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 font-bold shadow-md text-sm"
                      >
                        <Camera size={18} /> Capture & Verify ID
                      </button>
                    )}
                    
                    {!cameraError && (
                      <button 
                        type="button" 
                        onClick={toggleCameraFacing} 
                        className="btn btn-outline py-2.5 px-3" 
                        title="Switch Camera (Front/Back)"
                      >
                        <RefreshCw size={16} />
                      </button>
                    )}

                    <label className="btn btn-secondary py-2.5 px-3 flex items-center gap-1.5 cursor-pointer text-xs">
                      <Upload size={14} /> Upload
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default StudentBus;