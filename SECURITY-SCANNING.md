# Malware scanning
Uploads stay private. Finalization verifies the ZIP signature, then `/api/scans/source` performs archive safety/static scanning and records SHA-256. `publish` refuses every status except `clean`.

Checks: path traversal, file count, decompressed-size limit, per-entry limit, compression-bomb ratio, executable/script extensions, suspicious encoded-execution/download patterns. Optional ClamAV integration is enabled with `CLAMAV_SCANNER_URL` and `CLAMAV_SCANNER_SECRET`; the scanner receives a 15-minute private signed URL and should delete source immediately after scanning.

Static scanning is not a guarantee of malware-free software. For public launch, enable ClamAV and retain quarantine/admin review. Never execute uploaded code in Vercel.
