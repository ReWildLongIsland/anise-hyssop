import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Leaf, Check, AlertTriangle, ChevronRight, ChevronLeft, LogOut } from "lucide-react";

const STORAGE_KEY = "anise_hyssop_registration";
const EXPIRY_MS = 4 * 60 * 60 * 1000; // 4 hours

function loadSavedForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (Date.now() - saved._timestamp > EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

function saveForm(data: Record<string, unknown>) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...data, _timestamp: Date.now() })
  );
}

function clearSavedForm() {
  localStorage.removeItem(STORAGE_KEY);
}

const DEFAULT_FORM = {
  firstName: "",
  lastName: "",
  town: "",
  zipCode: "",
  isAdult: true,
  dateOfBirth: "",
  school: "",
  grade: "",
  selectedTeams: [] as string[],
  safetyAgreed: false,
  waiverAgreed: false,
  youthWaiverFile: null as File | null,
};

export default function Registration() {
  const { getAccessToken, logout } = useAuth();
  const navigate = useNavigate();

  const saved = loadSavedForm();
  const [step, setStep] = useState(saved?._step ?? 2);
  const [teamsConfig, setTeamsConfig] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    ...DEFAULT_FORM,
    ...(saved
      ? {
          firstName: saved.firstName ?? "",
          lastName: saved.lastName ?? "",
          town: saved.town ?? "",
          zipCode: saved.zipCode ?? "",
          isAdult: saved.isAdult ?? true,
          dateOfBirth: saved.dateOfBirth ?? "",
          school: saved.school ?? "",
          grade: saved.grade ?? "",
          selectedTeams: saved.selectedTeams ?? [],
          safetyAgreed: saved.safetyAgreed ?? false,
          waiverAgreed: saved.waiverAgreed ?? false,
        }
      : {}),
  });

  // Persist form to localStorage on every change
  useEffect(() => {
    const { youthWaiverFile, ...serializable } = formData;
    saveForm({ ...serializable, _step: step });
  }, [formData, step]);

  useEffect(() => {
    fetch("/api/teams")
      .then(res => res.json())
      .then(data => setTeamsConfig(data));
  }, []);

  // Auto-select chapters based on zip code when moving to step 3
  useEffect(() => {
    if (step === 3 && formData.zipCode && teamsConfig.length > 0) {
      const matchingChapters = teamsConfig
        .filter(t => t.type === "Chapter" && t.zipCodes.includes(formData.zipCode))
        .map(t => t.id);

      const noChapter = teamsConfig.find(t => t.name === "No Chapter");

      if (matchingChapters.length > 0) {
        setFormData(prev => {
          const newTeams = prev.selectedTeams.filter(id => id !== noChapter?.id);
          return {
            ...prev,
            selectedTeams: Array.from(new Set([...newTeams, ...matchingChapters]))
          };
        });
      } else {
        const zipPrefixes = ["110", "111", "113", "114", "115", "116", "117", "118", "119"];
        const startsWithPrefix = zipPrefixes.some(prefix => formData.zipCode.startsWith(prefix));

        if (startsWithPrefix) {
          const emergingChapter = teamsConfig.find(t => t.name === "Emerging Chapter");
          if (emergingChapter) {
            setFormData(prev => {
              const newTeams = prev.selectedTeams.filter(id => id !== noChapter?.id);
              return {
                ...prev,
                selectedTeams: Array.from(new Set([...newTeams, emergingChapter.id]))
              };
            });
          }
        } else {
          if (noChapter) {
            setFormData(prev => ({
              ...prev,
              selectedTeams: [noChapter.id]
            }));
          }
        }
      }
    }
  }, [step, formData.zipCode, teamsConfig]);

  useEffect(() => {
    if (!formData.isAdult && teamsConfig.length > 0) {
      setFormData(prev => {
        const committeeIds = teamsConfig.filter(t => t.type === 'Committee').map(t => t.id);
        const newSelectedTeams = prev.selectedTeams.filter(id => !committeeIds.includes(id));
        if (newSelectedTeams.length !== prev.selectedTeams.length) {
          return { ...prev, selectedTeams: newSelectedTeams };
        }
        return prev;
      });
    }
  }, [formData.isAdult, teamsConfig]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === "file") {
      const files = (e.target as HTMLInputElement).files;
      setFormData(prev => ({ ...prev, [name]: files ? files[0] : null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleTeam = (teamId: string) => {
    setFormData(prev => {
      const isSelected = prev.selectedTeams.includes(teamId);
      const noChapterTeam = teamsConfig.find(t => t.name === "No Chapter");

      if (noChapterTeam && teamId === noChapterTeam.id) {
        if (isSelected) {
          return { ...prev, selectedTeams: [] };
        } else {
          return { ...prev, selectedTeams: [teamId] };
        }
      } else {
        let newSelectedTeams = isSelected
          ? prev.selectedTeams.filter(id => id !== teamId)
          : [...prev.selectedTeams, teamId];

        if (noChapterTeam) {
          newSelectedTeams = newSelectedTeams.filter(id => id !== noChapterTeam.id);
        }

        return { ...prev, selectedTeams: newSelectedTeams };
      }
    });
  };

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      const submitData = new FormData();
      submitData.append("firstName", formData.firstName);
      submitData.append("lastName", formData.lastName);
      submitData.append("town", formData.town);
      submitData.append("zipCode", formData.zipCode);
      submitData.append("isAdult", formData.isAdult.toString());
      submitData.append("selectedTeams", JSON.stringify(formData.selectedTeams));
      submitData.append("waiverAgreed", formData.waiverAgreed.toString());

      if (!formData.isAdult) {
        submitData.append("dateOfBirth", formData.dateOfBirth);
        submitData.append("school", formData.school);
        submitData.append("grade", formData.grade);
        if (formData.youthWaiverFile) {
          submitData.append("youthWaiverFile", formData.youthWaiverFile);
        }
      }

      const res = await fetch("/api/registration/complete", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: submitData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }));
        throw new Error(err.detail || `Server returned ${res.status}`);
      }

      clearSavedForm();
      window.location.href = "/portal";
    } catch (error: any) {
      console.error("Failed to complete registration", error);
      alert(error.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [formData, getAccessToken]);

  const handleDownloadWaiver = async (type: 'adult' | 'youth') => {
    try {
      const url = `/Branding/Waivers/${type}-waiver.pdf`;
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${type}-waiver.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Failed to download waiver", error);
    }
  };

  const renderProgressBar = () => {
    const totalSteps = 4; // Steps 2, 3, 4, 5
    const currentProgress = ((step - 1) / totalSteps) * 100;

    return (
      <div className="w-full bg-stone-200 h-2 rounded-full mb-8 overflow-hidden">
        <div
          className="bg-[var(--color-rewild-green)] h-full transition-all duration-500 ease-in-out"
          style={{ width: `${currentProgress}%` }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[var(--color-stone-50)] flex flex-col relative overflow-hidden">
      {/* Subtle Native Plant Background (Abstract SVG) */}
      <div className="absolute inset-0 pointer-events-none text-[#2D5A27]/5">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="leaves-reg" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M50 10 Q60 30 50 50 Q40 30 50 10 Z" fill="currentColor" transform="rotate(45 50 50)" />
              <path d="M20 60 Q30 80 20 100 Q10 80 20 60 Z" fill="currentColor" transform="rotate(-30 20 80)" />
              <path d="M80 40 Q90 60 80 80 Q70 60 80 40 Z" fill="currentColor" transform="rotate(15 80 60)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#leaves-reg)" />
        </svg>
      </div>

      <header className="w-full p-6 flex justify-between items-center bg-white shadow-sm z-10">
        <div className="w-24"></div>
        <div className="flex items-center gap-2">
          <img src="/Branding/logo-banner.png" alt="ReWild Long Island" className="h-10 md:h-16 lg:h-20 object-contain transition-all" referrerPolicy="no-referrer" onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }} />
          <div className="hidden flex items-center gap-2 text-[var(--color-rewild-green)]">
            <Leaf className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight">ReWild Long Island</span>
          </div>
        </div>
        <div className="w-24 flex justify-end">
          <button
            onClick={() => { clearSavedForm(); logout(); }}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Start Over</span>
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center p-6 max-w-2xl mx-auto w-full">
        <div className="w-full mt-8">
          {renderProgressBar()}

          <div className="bg-white rounded-3xl shadow-md p-8 border border-stone-100">
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-[var(--color-rewild-green)] mb-6">Personal Information</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">First Name</label>
                      <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Last Name</label>
                      <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none" required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Town</label>
                      <input type="text" name="town" value={formData.town} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">Zip Code</label>
                      <input type="text" name="zipCode" value={formData.zipCode} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none" required />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <label className={`flex items-start p-4 rounded-xl border cursor-pointer transition-colors ${formData.isAdult ? 'border-[var(--color-rewild-green)] bg-green-50/50' : 'border-stone-200 hover:bg-stone-50'}`}>
                      <input
                        type="radio"
                        name="isAdult"
                        checked={formData.isAdult}
                        onChange={() => setFormData(prev => ({ ...prev, isAdult: true }))}
                        className="mt-1 mr-3 w-5 h-5 text-[var(--color-rewild-green)] focus:ring-[var(--color-rewild-green)]"
                      />
                      <span className="text-stone-700 font-medium">Adult: I am 18 years of age or older</span>
                    </label>
                    <label className={`flex items-start p-4 rounded-xl border cursor-pointer transition-colors ${!formData.isAdult ? 'border-[var(--color-rewild-green)] bg-green-50/50' : 'border-stone-200 hover:bg-stone-50'}`}>
                      <input
                        type="radio"
                        name="isAdult"
                        checked={!formData.isAdult}
                        onChange={() => setFormData(prev => ({ ...prev, isAdult: false }))}
                        className="mt-1 mr-3 w-5 h-5 text-[var(--color-rewild-green)] focus:ring-[var(--color-rewild-green)]"
                      />
                      <span className="text-stone-700 font-medium">Youth: I am under 18 years of age</span>
                    </label>
                  </div>

                  {!formData.isAdult && (
                    <div className="mt-4 p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                      <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">Date of Birth</label>
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          min={new Date(new Date().getFullYear() - 18, new Date().getMonth(), new Date().getDate() + 1).toISOString().split('T')[0]}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none"
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">School</label>
                          <input type="text" name="school" value={formData.school} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none" required />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-1">Grade</label>
                          <select name="grade" value={formData.grade} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none bg-white" required>
                            <option value="">Select Grade</option>
                            <option value="Middle School">Middle School</option>
                            <option value="9th Grade">9th Grade</option>
                            <option value="10th Grade">10th Grade</option>
                            <option value="11th Grade">11th Grade</option>
                            <option value="12th Grade">12th Grade</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => { clearSavedForm(); logout(); }} className="text-stone-500 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-stone-100 border border-stone-200">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={
                      !formData.firstName ||
                      !formData.lastName ||
                      !formData.zipCode ||
                      (!formData.isAdult && (!formData.dateOfBirth || !formData.school || !formData.grade))
                    }
                    className="bg-[var(--color-rewild-green)] text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-[var(--color-rewild-green)] mb-2">Team Selection</h2>
                <p className="text-stone-600 mb-4">Select the chapters, committees, or programs you'd like to join. We've pre-selected chapters based on your zip code.</p>
                <p className="text-stone-600 mb-6 font-medium bg-green-50 p-4 rounded-xl border border-green-100">
                  This selection helps ReWild highlight events that match your interests and allows us to invite you to join committees when there are openings. These selections do not restrict your ability to view events from other chapters. You can update these preferences anytime from your profile page.
                </p>

                <div className={`grid grid-cols-1 ${!formData.isAdult ? 'md:grid-cols-2' : ''} gap-6`}>
                  {["Chapter", "Committee", "Program"]
                    .filter(type => formData.isAdult || type !== "Committee")
                    .map(type => (
                    <div key={type}>
                      <h3 className="text-lg font-semibold text-[var(--color-rewild-green)] mb-3 border-b border-stone-100 pb-2">{type}s</h3>
                      <div className="space-y-2">
                        {teamsConfig.filter(t => t.type === type).map(team => (
                          <label key={team.id} className={`flex items-start p-4 rounded-xl border cursor-pointer transition-colors ${formData.selectedTeams.includes(team.id) ? 'border-[var(--color-rewild-green)] bg-green-50/50' : 'border-stone-200 hover:bg-stone-50'}`}>
                            <input
                              type="checkbox"
                              className="hidden"
                              checked={formData.selectedTeams.includes(team.id)}
                              onChange={() => toggleTeam(team.id)}
                            />
                            <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 ${formData.selectedTeams.includes(team.id) ? 'bg-[var(--color-rewild-green)] text-white' : 'border border-stone-300'}`}>
                              {formData.selectedTeams.includes(team.id) && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <span className="font-bold text-stone-800 block">{team.name}</span>
                              <span className="text-sm text-stone-600 mt-1 block leading-relaxed">{team.description}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(2)} className="text-stone-500 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-stone-100 border border-stone-200">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={formData.selectedTeams.length === 0}
                    className="bg-[var(--color-rewild-green)] text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-[var(--color-rewild-green)] mb-6">Safety Rules</h2>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-[var(--color-earth-sand)] flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-orange-900 mb-2">Universal Safety Precautions</h3>
                      <ul className="list-disc list-inside text-orange-800 space-y-2 text-sm">
                        <li>Always wear appropriate closed-toe footwear.</li>
                        <li>Stay hydrated and take breaks in shaded areas.</li>
                        <li>Use tools only as instructed by team leads.</li>
                        <li>Report any injuries immediately to a supervisor.</li>
                        <li>Be aware of local wildlife and plants (e.g., ticks, poison ivy).</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mb-6 flex justify-center">
                  <img src="/Branding/Waivers/Safety Waiver Graphic.png" alt="Safety First" className="w-full max-w-md rounded-2xl object-cover shadow-sm" referrerPolicy="no-referrer" onError={(e) => e.currentTarget.style.display = 'none'} />
                </div>

                <label className="flex items-start p-4 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                  <input
                    type="checkbox"
                    name="safetyAgreed"
                    checked={formData.safetyAgreed}
                    onChange={handleInputChange}
                    className="mt-1 mr-3 w-5 h-5 text-[var(--color-rewild-green)] rounded focus:ring-[var(--color-rewild-green)]"
                  />
                  <span className="text-stone-700">I have read and agree to follow the universal safety precautions while volunteering with ReWild Long Island.</span>
                </label>

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(3)} className="text-stone-500 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-stone-100 border border-stone-200">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={() => setStep(5)}
                    disabled={!formData.safetyAgreed}
                    className="bg-[var(--color-rewild-green)] text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 5 && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-bold text-[var(--color-rewild-green)] mb-6">Liability Waiver</h2>

                <div className="bg-white/50 border border-gray-200 rounded-2xl p-6 mb-6 max-h-96 overflow-y-scroll text-sm text-stone-700 space-y-4 shadow-inner">
                  <p className="font-bold text-base text-stone-900">PARTICIPANT WAIVER AND RELEASE OF LIABILITY</p>
                  <p>In consideration of being allowed to participate in any way in ReWild Long Island programs, related events, and activities, the undersigned acknowledges, appreciates, and agrees that:</p>
                  <p>1. The risk of injury from the activities involved in this program is significant, including the potential for permanent paralysis and death, and while particular rules, equipment, and personal discipline may reduce this risk, the risk of serious injury does exist; and,</p>
                  <p>2. I KNOWINGLY AND FREELY ASSUME ALL SUCH RISKS, both known and unknown, EVEN IF ARISING FROM THE NEGLIGENCE OF THE RELEASEES or others, and assume full responsibility for my participation; and,</p>
                  <p>3. I willingly agree to comply with the stated and customary terms and conditions for participation. If, however, I observe any unusual significant hazard during my presence or participation, I will remove myself from participation and bring such to the attention of the nearest official immediately; and,</p>
                  <p>4. I, for myself and on behalf of my heirs, assigns, personal representatives and next of kin, HEREBY RELEASE AND HOLD HARMLESS ReWild Long Island, their officers, officials, agents, and/or employees, other participants, sponsoring agencies, sponsors, advertisers, and if applicable, owners and lessors of premises used to conduct the event ("RELEASEES"), WITH RESPECT TO ANY AND ALL INJURY, DISABILITY, DEATH, or loss or damage to person or property, WHETHER ARISING FROM THE NEGLIGENCE OF THE RELEASEES OR OTHERWISE, to the fullest extent permitted by law.</p>

                  <p className="font-bold text-base text-stone-900 mt-6">MEDICAL TREATMENT</p>
                  <p>I hereby consent to receive medical treatment which may be deemed advisable in the event of injury, accident, and/or illness during this activity. I acknowledge that ReWild Long Island and its agents are not responsible for any medical costs incurred as a result of my participation.</p>

                  <p className="font-bold text-base text-stone-900 mt-6">RECORDS/MEDIA RELEASE</p>
                  <p>I hereby grant ReWild Long Island, its representatives, and employees the right to take photographs, video, and audio recordings of me and my property in connection with the above-identified subject. I authorize ReWild Long Island, its assigns and transferees to copyright, use and publish the same in print and/or electronically. I agree that ReWild Long Island may use such photographs, video, and audio of me with or without my name and for any lawful purpose, including for example such purposes as publicity, illustration, advertising, and Web content.</p>

                  <p className="font-bold text-base text-stone-900 mt-6">INDEMNIFICATION</p>
                  <p>I agree to indemnify, defend, and hold harmless the RELEASEES from and against any and all claims, demands, causes of action, losses, damages, liabilities, costs and expenses, including reasonable attorneys' fees, arising out of or relating to my participation in ReWild Long Island programs, related events, and activities, whether caused by the negligence of the RELEASEES or otherwise.</p>
                </div>

                {!formData.isAdult ? (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex-grow">
                        <h3 className="font-bold text-stone-800 mb-1">Youth Waiver Required</h3>
                        <p className="text-sm text-stone-600">Since you are under 18, a parent or guardian must co-sign your liability waiver.</p>
                      </div>
                      <button
                        onClick={() => handleDownloadWaiver('youth')}
                        className="flex-shrink-0 px-4 py-2 border-2 border-[var(--color-rewild-green)] text-[var(--color-rewild-green)] rounded-xl font-medium hover:bg-[var(--color-rewild-green)] hover:text-white transition-colors text-center"
                      >
                        Download Waiver
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">Upload Co-Signed Youth Waiver</label>
                      <input
                        type="file"
                        name="youthWaiverFile"
                        onChange={handleInputChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-[var(--color-rewild-green)] focus:outline-none bg-white"
                        required
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-4 p-6 bg-green-50 border border-green-100 rounded-2xl">
                      <div className="flex-grow">
                        <h3 className="font-bold text-stone-800 mb-1">Adult Waiver</h3>
                        <p className="text-sm text-stone-600">Please download and review the full liability waiver.</p>
                      </div>
                      <button
                        onClick={() => handleDownloadWaiver('adult')}
                        className="flex-shrink-0 px-4 py-2 border-2 border-[var(--color-rewild-green)] text-[var(--color-rewild-green)] rounded-xl font-medium hover:bg-[var(--color-rewild-green)] hover:text-white transition-colors text-center"
                      >
                        Download Waiver
                      </button>
                    </div>
                    <label className="flex items-start p-4 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50">
                      <input
                        type="checkbox"
                        name="waiverAgreed"
                        checked={formData.waiverAgreed}
                        onChange={handleInputChange}
                        className="mt-1 mr-3 w-5 h-5 text-[var(--color-rewild-green)] rounded focus:ring-[var(--color-rewild-green)]"
                      />
                      <span className="text-stone-700">I have read this release of liability and assumption of risk agreement, fully understand its terms, understand that I have given up substantial rights by signing it, and sign it freely and voluntarily without any inducement.</span>
                    </label>
                  </div>
                )}

                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(4)} className="text-stone-500 px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-stone-100 border border-stone-200">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || (formData.isAdult ? !formData.waiverAgreed : !formData.youthWaiverFile)}
                    className="bg-[var(--color-rewild-green)] text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Complete Registration"} <Check className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
