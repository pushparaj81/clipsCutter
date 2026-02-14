SELECT "id", "status", "error", "videoId", "createdAt" 
FROM "Clip" 
WHERE "status" = 'FAILED' 
ORDER BY "createdAt" DESC 
LIMIT 5;
