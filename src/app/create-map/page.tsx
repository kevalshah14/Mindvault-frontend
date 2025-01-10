'use client';
import React, { useState } from 'react';
import 'daisyui/dist/full.css';
import axios from 'axios';

interface ServerResponse {
    processed_data: string;
    id: string;
}

const CreateMapPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [serverResponse, setServerResponse] = useState<[ServerResponse] | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [response, setResponse] = useState<any | null>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!file) return;

        setLoading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/upload', {
                formData,
            });

            if (response) {
                // Handle successful response
                console.log('File uploaded successfully');
                if (serverResponse && serverResponse.length > 0) {
                    const newData = [...serverResponse, { processed_data: response.data.processed_data, id: response.data.id }];
                    setServerResponse(newData as [ServerResponse]);
                }
            } else {
                // Handle error response
                console.error('File upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            alert("Please select a file to upload");
            return;
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        try {
            const res = await axios.post("http://127.0.0.1:8000/upload/", {
                formData,
            });
            if (!res) {
                throw new Error("Failed to upload file");
            }
            setResponse(res.data);
        } catch (error: any) {
            console.error("Error uploading file:", error);
            // alert(error.message);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Upload File</h1>
            <form onSubmit={handleUpload} className="space-y-4">
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
            {
                serverResponse && serverResponse.length > 0 && (
                    <div className="mt-4">
                        <h2 className="text-xl font-bold">Processed Data</h2>
                        <ul className="list-disc list-inside">
                            {serverResponse.map((data) => (
                                <li key={data.id} className="mt-2">{data.processed_data}</li>
                            ))}
                        </ul>
                    </div>
                )
            }
        </div>
    );
};

export default CreateMapPage;