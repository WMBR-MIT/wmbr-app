import { Show } from '../types/RecentlyPlayed';

export const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const formatTime = (timeString: string) => {
  try {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    return timeString;
  }
};

export const secondsToTime = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

export const getDurationFromSize = (
  sizeInBytesString: string,
  bitrateKbps = 128
): string => {
  const sizeInBytes = parseInt(sizeInBytesString, 10);
  if (isNaN(sizeInBytes) || sizeInBytes <= 0) return 'Unknown';

  // Convert bitrate to bits per second
  const bitrateBps = bitrateKbps * 1000;

  // Duration in seconds = (bytes * 8) / bitrate in bits per second
  const durationSeconds = Math.floor((sizeInBytes * 8) / bitrateBps);

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
};

export const formatShowTime = (show: Show) => {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = show.day === 7 ? 'Weekdays' : dayNames[show.day];
  // Only add 's' if it's not already plural (weekdays)
  const plural = show.day === 7 ? dayName : `${dayName}s`;
  return `${plural} at ${show.time_str}`;
};

/* Get current date in ISO format (YYYY-MM-DD) in Eastern Time
*/
export const getDateISO = (): string => {
  let dateStr: string;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  dateStr = `${year}-${month}-${day}`;
  return dateStr;
};