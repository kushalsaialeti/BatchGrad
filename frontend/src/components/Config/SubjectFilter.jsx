import React from 'react';
import { Search, Loader2 } from 'lucide-react';
import { SEMESTER_OPTIONS } from '../../constants';

const SubjectFilter = ({ 
  semester, 
  onSemesterChange, 
  onFetchSubjects, 
  fetchingSubjects, 
  subjects, 
  targetCode, 
  onSubjectSelect 
}) => {
  return (
    <>
      <div className="space-y-2 mb-6">
        <label className="text-sm font-medium text-gray-400">Target Semester</label>
        <div className="relative">
          <select
            required
            name="semester"
            value={semester}
            onChange={onSemesterChange}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono appearance-none"
          >
            <option value="" disabled>Select Target Semester</option>
            {SEMESTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
            <Search className="w-4 h-4" />
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-400">Target Subjects</label>
          <button 
            type="button" 
            onClick={onFetchSubjects}
            disabled={fetchingSubjects || !semester}
            className="text-xs flex items-center gap-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-indigo-300 transition-colors disabled:opacity-50"
          >
            {fetchingSubjects ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
            Fetch Subjects
          </button>
        </div>

        {!subjects ? (
          <div className="text-xs text-gray-500 italic px-1 cursor-default">
            Click &apos;Fetch Subjects&apos; to populate valid courses for this semester.
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar border border-white/5 bg-black/20 p-2 rounded-xl">
             <button
               type="button"
               onClick={() => onSubjectSelect("")}
               className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${targetCode === "" ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}`}
             >
               <span className="font-bold flex gap-2">ALL SUBJECTS <span className="text-gray-500 font-normal">Extract entire semester</span></span>
             </button>
             {subjects.map(sub => (
               <button
                 type="button"
                 key={sub.code}
                 onClick={() => onSubjectSelect(sub.code)}
                 className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${targetCode === sub.code ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300' : 'bg-transparent border-transparent hover:bg-white/5 text-gray-400'}`}
               >
                 <span className="font-bold">{sub.code}</span> - <span className="opacity-80">{sub.name}</span>
               </button>
             ))}
          </div>
        )}
      </div>
    </>
  );
};

export default SubjectFilter;
