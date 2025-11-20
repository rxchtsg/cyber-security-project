import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";

interface CSVUploaderProps {
  onDataLoaded: (data: any[]) => void;
}

export const CSVUploader = ({ onDataLoaded }: CSVUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const parseWithOptions = (file: File, delimiter?: string) => {
    return new Promise<{ data: any[]; meta: any }>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: true,
        delimiter: delimiter,
        transformHeader: (header: string) => {
          // Remove BOM, trim whitespace, normalize inner spacing
          return header.replace(/^\uFEFF/, '').trim().replace(/\s+/g, ' ');
        },
        complete: (results) => resolve(results),
        error: (error) => reject(error)
      });
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadStatus('idle');

    try {
      // Detect delimiter: try ',', then ';', then tab
      let results = await parseWithOptions(file, ',');
      if ((results.data as any[]).length === 0) {
        results = await parseWithOptions(file, ';');
      }
      if ((results.data as any[]).length === 0) {
        results = await parseWithOptions(file, '\t');
      }

      const rows = results.data as any[];
      
      if (rows.length === 0) {
        setUploadStatus('error');
        toast({
          title: "Parsed 0 rows",
          description: "CSV file appears to be empty"
        });
        setIsUploading(false);
        return;
      }

      // Pass raw rows to parent - no validation errors
      onDataLoaded(rows);
      
      setUploadStatus('success');
      toast({
        title: "Upload Successful",
        description: `Successfully imported ${rows.length} records from CSV`
      });
      setIsUploading(false);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: "There was an error parsing the CSV file",
        variant: "destructive"
      });
      setIsUploading(false);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-buddywise-green" />
          Upload CSV Data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Upload incident data from CSV file
          </p>
          
          <div className="flex flex-col gap-2">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload">
              <Button 
                asChild
                disabled={isUploading}
                className="w-full bg-buddywise-green hover:bg-buddywise-dark-green cursor-pointer"
              >
                <span>
                  <Upload className="h-4 w-4 mr-2" />
                  {isUploading ? 'Uploading...' : 'Select CSV File'}
                </span>
              </Button>
            </label>

            {uploadStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Upload successful!
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                Upload failed. Please try again.
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
