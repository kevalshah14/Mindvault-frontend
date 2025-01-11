'use client';
import React, { useState, useRef } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import { motion } from 'framer-motion';
import { AiOutlineUpload } from 'react-icons/ai';
import { ClipLoader } from 'react-spinners';

const CreateMapPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverResponse, setServerResponse] = useState<any>(null);
  const d3Container = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // Handle form submission (upload)
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
      // Upload file to server
      const uploadResponse = await axios.post("http://127.0.0.1:8000/upload/", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("Upload response:", uploadResponse.data);

       // Fetch processed JSON data
       const fileName = "sample.json"; // Ensure this file name matches the backend response
       const secRes = await axios.get(`http://127.0.0.1:8000/get-json/${fileName}`);
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
       } else if (lookup[item.parent_id]) {
         lookup[item.parent_id].children.push(lookup[item.id]);
       }
     });
 
     return tree[0]; // Return the root node
   }
 


  // Adjust text size based on length
  const getFontSize = (text: string) => {
    const length = text.length;
    if (length < 20) return '14px';
    if (length < 40) return '12px';
    return '10px';
  };

  // Helper function to wrap long text in <text> elements
  const wrapText = (text: any, width: number) => {
    text.each(function () {
      const textElement = d3.select(this);
      const words = textElement.text().split(/\s+/).reverse();
      let word: string | undefined;
      let line: string[] = [];
      const lineHeight = 1.1; // in ems
      const y = textElement.attr("y");
      const x = textElement.attr("x");
      const dy = parseFloat(textElement.attr("dy"));
      let tspan = textElement.text(null)
        .append("tspan")
        .attr("x", x)
        .attr("y", y)
        .attr("dy", dy + "em");

      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if ((tspan.node() as any).getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = textElement.append("tspan")
            .attr("x", x)
            .attr("y", y)
            .attr("dy", lineHeight + "em")
            .text(word);
        }
      }
    });
  };

  // Render D3 Mind Map
  const renderMindMap = (data: any) => {
    if (!d3Container.current) return;

    // Clear previous SVG content
    d3.select(d3Container.current).selectAll('*').remove();

    const width = d3Container.current.clientWidth;
    const height = d3Container.current.clientHeight;

    // Create main SVG with zoom/pan
    const svg = d3
      .select(d3Container.current)
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom().on("zoom", (event) => {
        g.attr("transform", event.transform);
      }))
      .style('background', 'transparent');

    const g = svg.append("g");
    const root = d3.hierarchy(data);
    const treeLayout = d3.tree().size([height, width - 300]);
    treeLayout(root);

    // Node gradient background
    svg.append("defs")
      .append("linearGradient")
      .attr("id", "gradientNode")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "100%")
      .selectAll("stop")
      .data([
        { offset: "0%", color: "#6dd5ed" },
        { offset: "100%", color: "#2193b0" }
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    // Draw links
    g.selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", "#888")
      .attr("stroke-width", 2)
      .attr("d", d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x)
      )
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .attr("opacity", 1);

    // Draw nodes
    const node = g.selectAll(".node")
      .data(root.descendants())
      .enter()
      .append("g")
      .attr("class", "node group")
      .attr("transform", (d) => `translate(${d.y},${d.x})`)
      .on("mouseover", (event, d) => {
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = "1";
          tooltipRef.current.innerHTML = d.data.name;
          tooltipRef.current.style.left = `${event.pageX + 10}px`;
          tooltipRef.current.style.top = `${event.pageY + 10}px`;
        }
      })
      .on("mouseout", () => {
        if (tooltipRef.current) {
          tooltipRef.current.style.opacity = "0";
        }
      });

    // Node circles
    node.append("circle")
      .attr("r", 10)
      .attr("fill", "url(#gradientNode)")
      .attr("stroke", "#222")
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .transition()
      .duration(600)
      .attr("opacity", 1);

    // Node labels
    node.append("text")
      .attr("dy", ".35em")
      .attr("x", (d: any) => (d.children ? -15 : 15))
      .attr("text-anchor", (d: any) => (d.children ? "end" : "start"))
      .attr("font-size", (d: any) => getFontSize(d.data.name))
      .attr("fill", "#fff")
      .attr("opacity", 0)
      .text((d: any) => d.data.name)
      .call(wrapText, 140)
      .transition()
      .delay(600)
      .attr("opacity", 1);
  };

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Animated swirling background gradient */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-[#0f0c29] via-[#302b63] to-[#24243e]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
      {/* Floating blob top-left */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-purple-800 filter blur-3xl opacity-20 top-[-5rem] left-[-5rem]"
        animate={{
          y: [0, 40, 0],
          x: [0, 40, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      {/* Floating blob bottom-right */}
      <motion.div
        className="absolute w-96 h-96 rounded-full bg-indigo-700 filter blur-3xl opacity-20 bottom-[-5rem] right-[-5rem]"
        animate={{
          y: [0, -40, 0],
          x: [0, -40, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 container mx-auto py-12 px-4 flex flex-col items-center">
        {/* Card container with glassmorphism */}
        <motion.div
          initial={{ scale: 0.9, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="w-full max-w-4xl bg-white/10 backdrop-blur-lg shadow-2xl rounded-3xl p-8 border border-white/10"
        >
          <motion.h1
            className="text-4xl font-extrabold mb-6 text-center text-white drop-shadow-lg"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            Interactive Mind Map
          </motion.h1>

          {/* File Upload Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            {/* File Drop/Select Area */}
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-xl cursor-pointer hover:border-white/50 transition-colors duration-300 bg-black/20">
              <div className="flex flex-col items-center text-white/80 p-4">
                <AiOutlineUpload size={50} className="text-white/50" />
                {!selectedFile ? (
                  <span className="mt-4 font-medium text-sm leading-5 text-center">
                    Drag & Drop your file here <br /> or{" "}
                    <span className="underline">click to browse</span>
                  </span>
                ) : (
                  <span className="mt-4 text-sm font-semibold">
                    File selected: <span className="text-pink-300">{selectedFile.name}</span>
                  </span>
                )}
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.pptx,.docx,.html,.csv,.json,.xml"
                  className="hidden"
                />
              </div>
            </label>

            <div className="flex justify-center">
              <button
                type="submit"
                className={`flex items-center px-8 py-3 font-bold rounded-xl transition-all duration-300 text-white 
                  ${
                    loading
                      ? "bg-gray-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-pink-500 hover:to-purple-600 hover:scale-105 shadow-xl"
                  }`}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <ClipLoader size={20} color="#ffffff" className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <AiOutlineUpload className="mr-2 text-xl" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </motion.form>

          {/* Loading Spinner */}
          {loading && (
            <motion.div
              className="mt-6 flex justify-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <ClipLoader size={40} color="#ffffff" />
            </motion.div>
          )}

          {/* Server Response */}
          {serverResponse && (
            <motion.div
              className="mt-6 bg-black/30 border border-white/10 rounded-xl p-4 shadow-md max-h-60 overflow-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-lg font-bold text-white/90 mb-2">
                Server Response
              </h2>
              <pre className="text-sm text-white/80 whitespace-pre-wrap break-words">
                {JSON.stringify(serverResponse, null, 2)}
              </pre>
            </motion.div>
          )}

          {/* Tooltip for Mind Map Nodes */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 transition-opacity duration-300 z-50"
            style={{ position: 'absolute' }}
          ></div>

          {/* D3 Mind Map Container */}
          <motion.div
            className="mt-8 w-full h-96 relative rounded-xl overflow-hidden border border-white/10 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
            <svg ref={d3Container} className="w-full h-full" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateMapPage;
