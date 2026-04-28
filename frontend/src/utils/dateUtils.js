import { format, parseISO } from 'date-fns';

export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  return format(date, 'MMM dd, yyyy');
};

export const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
  return format(date, 'hh:mm a');
};
