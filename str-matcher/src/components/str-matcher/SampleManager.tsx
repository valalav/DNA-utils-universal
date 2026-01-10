"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Papa from 'papaparse';

interface Sample {
  kitNumber: string;
  name: string;
  country: string;
  haplogroup: string;
  markers: Record<string, string>;
}

interface SampleManagerProps {
  apiKey: string;
  backendUrl?: string;
  initialKitNumber?: string;
}

const COMMON_STR_MARKERS = [
  'DYS393', 'DYS390', 'DYS19', 'DYS391', 'DYS385', 'DYS426', 'DYS388', 'DYS439',
  'DYS389i', 'DYS392', 'DYS389ii', 'DYS458', 'DYS459', 'DYS455', 'DYS454', 'DYS447',
  'DYS437', 'DYS448', 'DYS449', 'DYS464', 'DYS460', 'Y-GATA-H4', 'YCAII', 'DYS456',
  'DYS607', 'DYS576', 'DYS570', 'CDY', 'DYS442', 'DYS438', 'DYS531', 'DYS578',
  'DYF395S1', 'DYS590', 'DYS537', 'DYS641', 'DYS472', 'DYF406S1', 'DYS511', 'DYS425',
  'DYS413', 'DYS557', 'DYS594', 'DYS436', 'DYS490', 'DYS534', 'DYS450', 'DYS444',
  'DYS481', 'DYS520', 'DYS446', 'DYS617', 'DYS568', 'DYS487', 'DYS572', 'DYS640',
  'DYS492', 'DYS565', 'DYS710', 'DYS485', 'DYS632', 'DYS495', 'DYS540', 'DYS714',
  'DYS716', 'DYS717', 'DYS505', 'DYS556', 'DYS549', 'DYS589', 'DYS522', 'DYS494',
  'DYS533', 'DYS636', 'DYS575', 'DYS638', 'DYS462', 'DYS452', 'DYS445', 'Y-GATA-A10',
  'DYS463', 'DYS441', 'Y-GGAAT-1B07', 'DYS525', 'DYS712', 'DYS593', 'DYS650', 'DYS532',
  'DYS715', 'DYS504', 'DYS513', 'DYS561', 'DYS552', 'DYS726', 'DYS635', 'DYS587',
  'DYS643', 'DYS497', 'DYS510', 'DYS434', 'DYS461', 'DYS435'
];

// Columns to keep from Google Sheets (all others are ignored)
const ALLOWED_COLUMNS = new Set([
  'Kit Number', 'Name', 'Paternal Ancestor Name', 'Country', 'Haplogroup',
  // All STR markers
  ...COMMON_STR_MARKERS
]);

const SampleManager: React.FC<SampleManagerProps> = ({ apiKey, backendUrl = '', initialKitNumber }) => {
  const [mode, setMode] = useState<'add' | 'edit' | 'bulk'>(initialKitNumber ? 'edit' : 'add');
  const [sample, setSample] = useState<Sample>({
    kitNumber: '',
    name: '',
    country: '',
    haplogroup: '',
    markers: {}
  });
  const [loading, setLoading] = useState(false);
  const [reloadingCache, setReloadingCache] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [clipboardText, setClipboardText] = useState('');
  const [parsedSamples, setParsedSamples] = useState<Sample[]>([]);

  // Google Sheets / URL import state
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
    inserted: number;
    skipped: number;
  } | null>(null);

  // Fetch sample for editing
  const fetchSample = useCallback(async (kitNumber: string) => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${backendUrl}/api/samples/${kitNumber}`);

      if (!response.ok) {
        throw new Error('Sample not found');
      }

      const data = await response.json();
      setSample({
        kitNumber: data.sample.kitNumber,
        name: data.sample.name || '',
        country: data.sample.country || '',
        haplogroup: data.sample.haplogroup || '',
        markers: data.sample.markers || {}
      });

      setMessage({ type: 'success', text: `Sample ${kitNumber} loaded successfully` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to load sample: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  // Auto-load sample if initialKitNumber is provided
  useEffect(() => {
    if (initialKitNumber) {
      fetchSample(initialKitNumber);
    }
  }, [initialKitNumber, fetchSample]);

  // Save sample (create or update)
  const saveSample = useCallback(async () => {
    if (!sample.kitNumber.trim()) {
      setMessage({ type: 'error', text: 'Kit Number is required' });
      return;
    }

    if (Object.keys(sample.markers).length === 0) {
      setMessage({ type: 'error', text: 'At least one marker is required' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${backendUrl}/api/samples`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify(sample)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to save sample');
      }

      const data = await response.json();
      setMessage({ type: 'success', text: `Sample ${sample.kitNumber} ${data.action} successfully` });

      // Clear form if adding new sample
      if (mode === 'add') {
        setSample({
          kitNumber: '',
          name: '',
          country: '',
          haplogroup: '',
          markers: {}
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  }, [sample, apiKey, backendUrl, mode]);

  // Parse clipboard data
  const parseClipboardData = useCallback(() => {
    if (!clipboardText.trim()) {
      setMessage({ type: 'error', text: 'Please paste data first' });
      return;
    }

    try {
      // Try to parse as CSV
      const parsed = Papa.parse(clipboardText.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });

      if (parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }

      const samples: Sample[] = [];

      parsed.data.forEach((row: any) => {
        // Extract kit number
        const kitNumber = row.kitNumber || row.kit_number || row.KitNumber || row['Kit Number'] || row.kitno;

        if (!kitNumber) {
          return; // Skip rows without kit number
        }

        // Extract basic info
        const name = row.name || row.Name || row.fullname || row['Full Name'] || '';
        const country = row.country || row.Country || row.location || row.Location || '';
        const haplogroup = row.haplogroup || row.Haplogroup || row['FTDNA HG'] || row.Yfull || '';

        // Extract markers
        const markers: Record<string, string> = {};
        Object.keys(row).forEach(key => {
          const upperKey = key.toUpperCase();
          if (upperKey.startsWith('DYS') || upperKey.startsWith('Y-') || upperKey.startsWith('CDY')) {
            const value = row[key]?.toString().trim();
            if (value && value !== '' && value !== '0' && value !== '-') {
              markers[key] = value;
            }
          }
        });

        if (Object.keys(markers).length > 0) {
          samples.push({
            kitNumber,
            name,
            country,
            haplogroup,
            markers
          });
        }
      });

      setParsedSamples(samples);
      setMessage({ type: 'success', text: `Parsed ${samples.length} samples successfully` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to parse: ${error instanceof Error ? error.message : 'Unknown error'}` });
    }
  }, [clipboardText]);

  // Upload parsed samples using bulk API (optimized for 1000+ samples)
  // Supports chunked upload for datasets > 2000 samples
  const uploadParsedSamples = useCallback(async () => {
    if (parsedSamples.length === 0) {
      setMessage({ type: 'error', text: 'No samples to upload' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setUploadProgress(null);

    const CHUNK_SIZE = 2000; // Optimal batch size for PostgreSQL
    const chunks: Sample[][] = [];

    // Split into chunks if needed
    for (let i = 0; i < parsedSamples.length; i += CHUNK_SIZE) {
      chunks.push(parsedSamples.slice(i, i + CHUNK_SIZE));
    }

    let totalInserted = 0;
    let totalSkipped = 0;
    let totalDuration = 0;
    const startTime = Date.now();

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        // Update progress
        setUploadProgress({
          current: i + 1,
          total: chunks.length,
          inserted: totalInserted,
          skipped: totalSkipped
        });

        const response = await fetch(`${backendUrl}/api/samples/bulk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          },
          body: JSON.stringify({ samples: chunk })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.message || `Chunk ${i + 1} failed`);
        }

        totalInserted += data.inserted;
        totalSkipped += data.skipped;
        totalDuration += data.duration;
      }

      const totalTime = Date.now() - startTime;
      const speed = Math.round(totalInserted / (totalTime / 1000));

      setMessage({
        type: totalSkipped > 0 ? 'error' : 'success',
        text: `Uploaded ${totalInserted} samples in ${totalTime}ms (${speed} samples/sec)${totalSkipped > 0 ? `. Skipped: ${totalSkipped} invalid` : ''}`
      });

      if (totalInserted > 0) {
        setParsedSamples([]);
        setClipboardText('');
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}. Uploaded ${totalInserted} before error.`
      });
    } finally {
      setLoading(false);
      setUploadProgress(null);
    }
  }, [parsedSamples, apiKey, backendUrl]);

  // Handle CSV file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setClipboardText(text);
    };
    reader.readAsText(file);
  }, []);

  // Convert Google Sheets URL to CSV export URL
  const getGoogleSheetsCsvUrl = useCallback((url: string, sheetName?: string): string | null => {
    try {
      // Already a CSV export URL
      if (url.includes('/pub?') && url.includes('output=csv')) {
        return url;
      }

      // Standard Google Sheets URL: https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit...
      const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) return null;

      const sheetId = match[1];

      // If sheet name is provided, we need to use the gviz API to get data
      // Otherwise, use the default export
      if (sheetName) {
        // Use the export URL with sheet parameter
        return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
      }

      // Extract gid from URL if present
      const gidMatch = url.match(/[#&]gid=(\d+)/);
      const gid = gidMatch ? gidMatch[1] : '0';

      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    } catch {
      return null;
    }
  }, []);

  // Load data from Google Sheets or CSV URL
  const loadFromUrl = useCallback(async () => {
    if (!sheetUrl.trim()) {
      setMessage({ type: 'error', text: 'Please enter a URL' });
      return;
    }

    setLoadingUrl(true);
    setMessage(null);

    try {
      let csvUrl = sheetUrl.trim();

      // Check if it's a Google Sheets URL
      if (csvUrl.includes('docs.google.com/spreadsheets')) {
        const convertedUrl = getGoogleSheetsCsvUrl(csvUrl, sheetName.trim() || undefined);
        if (!convertedUrl) {
          throw new Error('Invalid Google Sheets URL');
        }
        csvUrl = convertedUrl;
      }

      // Fetch the CSV data
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const csvText = await response.text();

      // Parse CSV
      const parsed = Papa.parse(csvText.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim()
      });

      if (parsed.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsed.errors);
      }

      // Process and filter data
      const samples: Sample[] = [];
      let skippedNoHaplogroup = 0;
      let skippedNoKit = 0;

      parsed.data.forEach((row: any) => {
        // Filter: skip rows without Haplogroup
        const haplogroup = row['Haplogroup'] || row.haplogroup || '';
        if (!haplogroup.trim()) {
          skippedNoHaplogroup++;
          return;
        }

        // Extract kit number
        const kitNumber = row['Kit Number'] || row.kitNumber || row.kit_number || row.KitNumber || '';
        if (!kitNumber.toString().trim()) {
          skippedNoKit++;
          return;
        }

        // Extract basic info (only allowed columns)
        const name = row['Name'] || row.name || '';
        const paternalAncestor = row['Paternal Ancestor Name'] || '';
        const country = row['Country'] || row.country || '';

        // Combine name with paternal ancestor if available
        const fullName = paternalAncestor ? `${name} (${paternalAncestor})` : name;

        // Extract markers (only STR markers)
        const markers: Record<string, string> = {};
        Object.keys(row).forEach(key => {
          const trimmedKey = key.trim();
          // Check if it's an allowed marker column
          if (ALLOWED_COLUMNS.has(trimmedKey) &&
              (trimmedKey.startsWith('DYS') || trimmedKey.startsWith('Y-') ||
               trimmedKey === 'YCAII' || trimmedKey === 'CDY')) {
            const value = row[key]?.toString().trim();
            if (value && value !== '' && value !== '0' && value !== '-') {
              markers[trimmedKey] = value;
            }
          }
        });

        if (Object.keys(markers).length > 0) {
          samples.push({
            kitNumber: kitNumber.toString().trim(),
            name: fullName,
            country,
            haplogroup,
            markers
          });
        }
      });

      setParsedSamples(samples);
      setMessage({
        type: 'success',
        text: `Loaded ${samples.length} samples from URL. Skipped: ${skippedNoHaplogroup} without haplogroup, ${skippedNoKit} without kit number.`
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to load: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoadingUrl(false);
    }
  }, [sheetUrl, sheetName, getGoogleSheetsCsvUrl]);

  // Reload cache - clear backend cache and optionally reload page
  const reloadCache = useCallback(async () => {
    setReloadingCache(true);
    setMessage(null);

    try {
      const response = await fetch(`${backendUrl}/api/admin/reload-cache`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey
        },
        body: JSON.stringify({ type: 'all' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to reload cache');
      }

      const data = await response.json();
      setMessage({
        type: 'success',
        text: `✅ ${data.message} Cache types cleared: ${data.clearedTypes.join(', ')}`
      });

      // Optionally reload the page after a short delay to refresh all data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to reload cache: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setReloadingCache(false);
    }
  }, [apiKey, backendUrl]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Sample Manager</CardTitle>
          <div className="flex gap-2 mt-2 items-center justify-between">
            <div className="flex gap-2">
              <Button
                variant={mode === 'add' ? 'default' : 'outline'}
                onClick={() => setMode('add')}
              >
                Add Sample
              </Button>
              <Button
                variant={mode === 'edit' ? 'default' : 'outline'}
                onClick={() => setMode('edit')}
              >
                Edit Sample
              </Button>
              <Button
                variant={mode === 'bulk' ? 'default' : 'outline'}
                onClick={() => setMode('bulk')}
              >
                Bulk Import
              </Button>
            </div>
            <Button
              onClick={reloadCache}
              disabled={reloadingCache}
              variant="outline"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {reloadingCache ? '🔄 Reloading...' : '🔄 Apply Changes'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}

          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Load Sample by Kit Number</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter Kit Number"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      fetchSample((e.target as HTMLInputElement).value);
                    }
                  }}
                />
                <Button
                  onClick={() => {
                    const input = document.querySelector('input[placeholder="Enter Kit Number"]') as HTMLInputElement;
                    if (input?.value) fetchSample(input.value);
                  }}
                  disabled={loading}
                >
                  Load
                </Button>
              </div>
            </div>
          )}

          {(mode === 'add' || mode === 'edit') && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kit Number *</Label>
                  <Input
                    value={sample.kitNumber}
                    onChange={(e) => setSample({ ...sample, kitNumber: e.target.value })}
                    disabled={mode === 'edit'}
                    placeholder="e.g., 55520"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={sample.name}
                    onChange={(e) => setSample({ ...sample, name: e.target.value })}
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={sample.country}
                    onChange={(e) => setSample({ ...sample, country: e.target.value })}
                    placeholder="e.g., USA"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Haplogroup</Label>
                  <Input
                    value={sample.haplogroup}
                    onChange={(e) => setSample({ ...sample, haplogroup: e.target.value })}
                    placeholder="e.g., R-M269"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>STR Markers</Label>
                <div className="grid grid-cols-4 gap-2 max-h-96 overflow-y-auto p-2 border rounded">
                  {COMMON_STR_MARKERS.map(marker => (
                    <div key={marker} className="flex items-center gap-2">
                      <Label className="text-xs w-20">{marker}</Label>
                      <Input
                        className="h-8"
                        value={sample.markers[marker] || ''}
                        onChange={(e) => {
                          const newMarkers = { ...sample.markers };
                          if (e.target.value.trim()) {
                            newMarkers[marker] = e.target.value.trim();
                          } else {
                            delete newMarkers[marker];
                          }
                          setSample({ ...sample, markers: newMarkers });
                        }}
                        placeholder="-"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Filled markers: {Object.keys(sample.markers).length}
                </p>
              </div>

              <Button onClick={saveSample} disabled={loading} className="w-full">
                {loading ? 'Saving...' : mode === 'add' ? 'Add Sample' : 'Update Sample'}
              </Button>
            </>
          )}

          {mode === 'bulk' && (
            <div className="space-y-4">
              {/* Google Sheets / URL Import Section */}
              <div className="p-4 border rounded-lg bg-blue-50 space-y-3">
                <h4 className="font-semibold text-blue-800">Import from Google Sheets or CSV URL</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-sm">Google Sheets URL or CSV link</Label>
                    <Input
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/... or CSV URL"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm">Sheet name (optional)</Label>
                    <Input
                      value={sheetName}
                      onChange={(e) => setSheetName(e.target.value)}
                      placeholder="e.g., Haplotypes"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={loadFromUrl} disabled={loadingUrl} variant="default">
                    {loadingUrl ? 'Loading...' : 'Load from URL'}
                  </Button>
                </div>
                <p className="text-xs text-blue-600">
                  Filters: Only rows with non-empty Haplogroup will be imported.
                  Columns: Kit Number, Name, Paternal Ancestor Name, Country, Haplogroup, and all STR markers.
                </p>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Or paste/upload data manually</h4>
              </div>

              <div className="space-y-2">
                <Label>Paste data from Excel or CSV</Label>
                <textarea
                  className="w-full h-48 p-2 border rounded font-mono text-sm"
                  value={clipboardText}
                  onChange={(e) => setClipboardText(e.target.value)}
                  placeholder="Paste your data here (with headers)&#10;Example:&#10;Kit Number,Name,Country,Haplogroup,DYS393,DYS390...&#10;55520,Pizhinov,Circassia,J-Y94477,12,22..."
                />
              </div>

              <div className="space-y-2">
                <Label>Or upload CSV file</Label>
                <Input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                />
              </div>

              <div className="flex gap-2 items-center">
                <Button onClick={parseClipboardData} variant="outline">
                  Parse Pasted Data
                </Button>
                {parsedSamples.length > 0 && (
                  <Button onClick={uploadParsedSamples} disabled={loading}>
                    {loading ? 'Uploading...' : `Upload ${parsedSamples.length} Samples`}
                  </Button>
                )}
                {uploadProgress && (
                  <span className="text-sm text-blue-600 ml-2">
                    Batch {uploadProgress.current}/{uploadProgress.total} | {uploadProgress.inserted} inserted
                  </span>
                )}
              </div>

              {/* Progress bar for large uploads */}
              {uploadProgress && uploadProgress.total > 1 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              )}

              {parsedSamples.length > 0 && (
                <div className="border rounded p-4 max-h-96 overflow-y-auto">
                  <h4 className="font-semibold mb-2">Parsed Samples ({parsedSamples.length})</h4>
                  <div className="space-y-2">
                    {parsedSamples.slice(0, 10).map((s, idx) => (
                      <div key={idx} className="text-sm border-b pb-2">
                        <strong>{s.kitNumber}</strong> - {s.name} ({s.haplogroup}) - {Object.keys(s.markers).length} markers
                      </div>
                    ))}
                    {parsedSamples.length > 10 && (
                      <p className="text-xs text-gray-500">... and {parsedSamples.length - 10} more</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SampleManager;
