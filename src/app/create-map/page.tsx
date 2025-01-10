'use client';
import React, { useState } from 'react';
import axios from 'axios';

const CreateMapPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverResponse, setServerResponse] = useState<any>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedFile) {
      alert("Please select a file to upload first.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      // IMPORTANT: Pass `formData` directly; don't wrap it in an object
      const res = await axios.post(
        "http://127.0.0.1:8000/upload/", 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      console.log("Server response:", res.data);
      setServerResponse(res.data);

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload File</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          className="file-input file-input-bordered w-full max-w-xs"
        />
        <button
          type="submit"
          className={`btn ${loading ? 'btn-disabled' : 'btn-primary'}`}
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {loading && <p className="mt-4 text-center">Loading...</p>}

      {serverResponse && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Server Response</h2>
          <pre>{JSON.stringify(serverResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default CreateMapPage;
