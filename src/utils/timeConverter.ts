export const formatTime = (seconds: number) => {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

export const toSeconds = (min: number, sec: number) => {
  return min * 60 + sec;
};
