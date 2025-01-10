'use client';
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';

const CreateMapPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverResponse, setServerResponse] = useState<any>(null);
  const d3Container = useRef<SVGSVGElement | null>(null);

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
      setServerResponse(res.data.data.processed_content);

      const file_name = "sample.json";
      const secRes = await axios.get(`http://127.0.0.1:8000/get-json/${file_name}`);
      const tree = buildTree(secRes.data);
      renderMindMap(tree);

    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  function buildTree(data: any) {
    const tree: any = [];
    const lookup: any = {};

    // Create a lookup object for quick access
    data.forEach((item: any) => {
      lookup[item.id] = { ...item, children: [] };
    });

    // Build the tree structure
    data.forEach((item: any) => {
      if (item.parent_id === null) {
        tree.push(lookup[item.id]);
      } else {
        lookup[item.parent_id].children.push(lookup[item.id]);
      }
    });

    return tree[0]; // Return the root node
  }

  const renderMindMap = (data: any) => {
    if (!d3Container.current) return;

    // Clear previous SVG
    d3.select(d3Container.current).selectAll('*').remove();

    const width = 1000;
    const height = 800;
    const svg = d3
      .select(d3Container.current)
      .attr('width', width)
      .attr('height', height);

    const root = d3.hierarchy(data);

    const treeLayout = d3.tree().size([height, width - 200]);
    treeLayout(root);

    // Create links
    svg
      .selectAll('.link')
      .data(root.links())
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('x1', (d: any) => d.source.y)
      .attr('y1', (d: any) => d.source.x)
      .attr('x2', (d: any) => d.target.y)
      .attr('y2', (d: any) => d.target.x)
      .attr('stroke', '#ccc');

    // Create nodes
    const nodes = svg
      .selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.y},${d.x})`);

    nodes
      .append('circle')
      .attr('r', 5)
      .attr('fill', '#69b3a2');

    nodes
      .append('text')
      .attr('dy', 3)
      .attr('x', (d) => (d.children ? -10 : 10))
      .style('text-anchor', (d) => (d.children ? 'end' : 'start'))
      .text((d) => d.data.name);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload File</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          onChange={handleFileChange}
          accept=".pdf,.pptx,.docx,.html,.csv,.json,.xml"
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

      {/* D3 Mind Map */}
      <svg ref={d3Container} className="mt-8"></svg>
    </div>
  );
};

export default CreateMapPage;
