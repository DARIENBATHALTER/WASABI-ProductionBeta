import { useInstructorDisplayName } from '../../contexts/InstructorNameContext';
import { useAnonymizer } from '../../contexts/AnonymizerContext';

interface InstructorNameProps {
  /** The original instructor name from the database */
  originalName: string;
  /** Additional CSS classes */
  className?: string;
  /** Fallback text if originalName is empty */
  fallback?: string;
}

/**
 * A component that automatically displays the mapped instructor name.
 * When anonymizer mode is enabled, shows a fictional teacher name instead.
 *
 * Usage:
 * <InstructorName originalName={student.homeRoomTeacher} />
 * <InstructorName originalName={observation.teacherName} className="font-bold" />
 */
export default function InstructorName({
  originalName,
  className = '',
  fallback = 'Unknown Teacher'
}: InstructorNameProps) {
  const displayName = useInstructorDisplayName(originalName || '');
  const { isAnonymized, formatTeacherName } = useAnonymizer();

  if (!originalName) {
    return <span className={className}>{fallback}</span>;
  }

  // If anonymizer is enabled, use fictional teacher name
  const finalDisplayName = isAnonymized ? formatTeacherName(originalName) : displayName;

  return (
    <span className={className} title={isAnonymized ? 'Demo Mode' : `Original: ${originalName}`}>
      {finalDisplayName}
    </span>
  );
}

// Utility function version for use in data processing/non-React contexts
export { useInstructorDisplayName, useInstructorDisplayNames } from '../../contexts/InstructorNameContext';