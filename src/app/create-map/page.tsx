'use client';
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import { AiOutlineUpload, AiOutlineSun, AiOutlineMoon } from 'react-icons/ai';
import { ClipLoader } from 'react-spinners';

const CreateMapPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [serverResponse, setServerResponse] = useState<any>(null);
  const d3Container = useRef<SVGSVGElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

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
      setServerResponse(uploadResponse.data);

      // Fetch processed JSON data
      const fileName = "sample.json"; // Adjust if different in your backend
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
      let tspan = textElement
        .text(null)
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
          tspan = textElement
            .append("tspan")
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
      .call(
        d3.zoom().on("zoom", (event) => {
          g.attr("transform", event.transform);
        })
      )
      .style('background', 'transparent');

    const g = svg.append("g");
    const root = d3.hierarchy(data);

    // Increase separation to reduce node overlap
    const treeLayout = d3
      .tree()
      .size([height, width - 50])
      .separation((a, b) => {
        // Increase these numbers for more space
        return a.parent === b.parent ? 2.5 : 3.0;
      });

    treeLayout(root);

    // OPTIONAL: Multiply x by a factor if you still see overlapping
    // (e.g., if you have many siblings and need more vertical spacing)
    const xSpacingFactor = 6.0; // Increase as needed (e.g., 1.5, 2.0, etc.)
    root.each((d: any) => {
      d.x *= xSpacingFactor;
    });

    // Define colors based on theme
    const linkColor = theme === 'light' ? '#717171' : '#888';
    const nodeStroke = theme === 'light' ? '#ccc' : '#222';
    const textColor = theme === 'light' ? '#222' : '#fff';

    // Node gradient background
    svg
      .append("defs")
      .append("linearGradient")
      .attr("id", "gradientNode")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "100%")
      .selectAll("stop")
      .data([
        // Soft pastel inspiration for light theme
        { offset: "0%", color: theme === 'light' ? "#f093fb" : "#6dd5ed" },
        { offset: "100%", color: theme === 'light' ? "#f5576c" : "#2193b0" }
      ])
      .enter()
      .append("stop")
      .attr("offset", (d) => d.offset)
      .attr("stop-color", (d) => d.color);

    // Draw links
    g
      .selectAll(".link")
      .data(root.links())
      .enter()
      .append("path")
      .attr("class", "link")
      .attr("fill", "none")
      .attr("stroke", linkColor)
      .attr("stroke-width", 2.5)
      .attr("stroke-linecap", "round")
      .attr(
        "d",
        d3
          .linkHorizontal()
          .x((d: any) => d.y)
          .y((d: any) => d.x) as any
      )
      .attr("opacity", 0)
      .transition()
      .duration(1000)
      .ease(d3.easeCubicInOut)
      .attr("opacity", 1);

    // Draw nodes
    const node = g
      .selectAll(".node")
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
    node
      .append("circle")
      .attr("r", 10)
      .attr("fill", "url(#gradientNode)")
      .attr("stroke", nodeStroke)
      .attr("stroke-width", 2)
      .attr("opacity", 0)
      .transition()
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr("opacity", 1);

    // Text labels
    node
      .append("text")
      .attr("dy", ".35em")
      // Offset text more so it doesn't collide with the circle
      .attr("x", (d: any) => (d.children ? -18 : 18))
      .attr("text-anchor", (d: any) => (d.children ? "end" : "start"))
      .attr("font-size", (d: any) => getFontSize(d.data.name))
      .attr("fill", textColor)
      .attr("opacity", 0)
      .text((d: any) => d.data.name)
      .call(wrapText, 150)
      .transition()
      .delay(800)
      .duration(800)
      .ease(d3.easeCubicInOut)
      .attr("opacity", 1);

    // Optional: Insert a subtle rectangle behind the text for readability
    node.each(function () {
      const group = d3.select(this);
      const text = group.select("text");
      const bbox = (text.node() as SVGTextElement).getBBox();

      // Insert rectangle *before* the text element in the DOM
      group
        .insert("rect", "text")
        .attr("x", bbox.x - 6)
        .attr("y", bbox.y - 3)
        .attr("width", bbox.width + 12)
        .attr("height", bbox.height + 6)
        .attr("rx", 4)
        .attr("ry", 4)
        .attr("fill", theme === 'light' ? '#ffffffcc' : '#000000cc')
        .attr("stroke", nodeStroke)
        .attr("stroke-width", 0.3)
        .attr("opacity", 0)
        .transition()
        .duration(800)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 1);
    });
  };

  // Update mind map when theme changes
  useEffect(() => {
    if (serverResponse) {
      const fileName = "sample.json"; // Adjust if different in your backend
      axios
        .get(`http://127.0.0.1:8000/get-json/${fileName}`)
        .then((secRes) => {
          const tree = buildTree(secRes.data);
          renderMindMap(tree);
        })
        .catch((error) => {
          console.error("Error fetching JSON data:", error);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Persist theme preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div
      className={`relative min-h-screen w-full overflow-hidden transition-colors duration-500 ${
        theme === 'light' ? 'bg-white' : 'bg-black'
      }`}
    >
      {/* Theme Toggle Button */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className={`p-2 rounded-full transition-colors duration-300 ${
            theme === 'light'
              ? 'bg-gray-200 hover:bg-gray-300'
              : 'bg-white/20 hover:bg-white/30'
          }`}
        >
          {theme === 'light' ? (
            <AiOutlineMoon size={24} className="text-yellow-500" />
          ) : (
            <AiOutlineSun size={24} className="text-yellow-300" />
          )}
        </button>
      </div>

      {/* Animated swirling background gradient */}
      <AnimatePresence>
        {theme === 'dark' ? (
          <motion.div
            key="dark-background"
            className="absolute inset-0 bg-gradient-to-r from-[#0f0c29] via-[#302b63] to-[#24243e]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        ) : (
          /* Modern, neutral gradient for Light theme */
          <motion.div
            key="light-background"
            className="absolute inset-0 bg-gradient-to-r from-[#fdfcfb] via-[#f6f7f8] to-[#ebedee]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>

      {/* Floating blobs with increased visibility */}
      {/* Top-left Blob */}
      <motion.div
        className={`absolute w-96 h-96 rounded-full filter blur-3xl opacity-40 top-[-5rem] left-[-5rem] transition-colors duration-500 ${
          theme === 'light' ? 'bg-pink-300' : 'bg-purple-800'
        }`}
        animate={{
          y: [0, 40, 0],
          x: [0, 40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      {/* Bottom-right Blob */}
      <motion.div
        className={`absolute w-96 h-96 rounded-full filter blur-3xl opacity-40 bottom-[-5rem] right-[-5rem] transition-colors duration-500 ${
          theme === 'light' ? 'bg-blue-300' : 'bg-indigo-700'
        }`}
        animate={{
          y: [0, -40, 0],
          x: [0, -40, 0],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      {/* Top-right Blob */}
      <motion.div
        className={`absolute w-96 h-96 rounded-full filter blur-3xl opacity-40 top-[-8rem] right-[-8rem] transition-colors duration-500 ${
          theme === 'light' ? 'bg-indigo-300' : 'bg-pink-800'
        }`}
        animate={{
          y: [0, 30, 0],
          x: [0, 30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />
      {/* Bottom-left Blob */}
      <motion.div
        className={`absolute w-96 h-96 rounded-full filter blur-3xl opacity-40 bottom-[-8rem] left-[-8rem] transition-colors duration-500 ${
          theme === 'light' ? 'bg-green-300' : 'bg-green-800'
        }`}
        animate={{
          y: [0, -30, 0],
          x: [0, 30, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut",
        }}
      />

      <div className="relative z-10 container mx-auto py-12 px-4 flex flex-col items-center">
        {/* Card container with glass morphism */}
        <motion.div
          initial={{ scale: 0.95, y: 50, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`w-full max-w-4xl backdrop-blur-lg shadow-2xl rounded-3xl p-8 border transition-colors duration-500 ${
            theme === 'light'
              ? 'bg-white/60 border-gray-200'
              : 'bg-white/10 border-white/10'
          }`}
        >
          <motion.h1
            className={`text-4xl font-extrabold mb-6 text-center transition-colors duration-500 ${
              theme === 'light' ? 'text-gray-800' : 'text-white'
            } drop-shadow-lg`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            Interactive Mind Map
          </motion.h1>

          {/* File Upload Form */}
          <motion.form
            onSubmit={handleSubmit}
            className="space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            {/* File Drop/Select Area */}
            <label
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-colors duration-300 backdrop-blur-md ${
                theme === 'light'
                  ? 'border-gray-300 bg-white/40 hover:border-gray-400'
                  : 'border-white/20 bg-black/20 hover:border-white/50'
              }`}
            >
              <div className="flex flex-col items-center text-center p-4">
                <AiOutlineUpload
                  size={50}
                  className={`mb-4 transition-colors duration-500 ${
                    theme === 'light' ? 'text-gray-600' : 'text-white/50'
                  }`}
                />
                {!selectedFile ? (
                  <span
                    className={`font-medium text-sm leading-5 transition-colors duration-500 ${
                      theme === 'light' ? 'text-gray-700' : 'text-white/80'
                    }`}
                  >
                    Drag & Drop your file here <br /> or{" "}
                    <span className="underline">click to browse</span>
                  </span>
                ) : (
                  <span
                    className={`text-sm font-semibold transition-colors duration-500 ${
                      theme === 'light' ? 'text-gray-800' : 'text-pink-300'
                    }`}
                  >
                    File selected:{" "}
                    <span className="font-medium">{selectedFile.name}</span>
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
                className={`flex items-center px-8 py-3 font-bold rounded-xl transition-all duration-500 text-white 
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
              className={`mt-6 rounded-xl p-4 shadow-md max-h-60 overflow-auto transition-colors duration-500 ${
                theme === 'light'
                  ? 'bg-white/50 border border-gray-200'
                  : 'bg-black/30 border border-white/10'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <h2
                className={`text-lg font-bold mb-2 transition-colors duration-500 ${
                  theme === 'light' ? 'text-gray-800' : 'text-white/90'
                }`}
              >
                Server Response
              </h2>
              <pre
                className={`text-sm whitespace-pre-wrap break-words transition-colors duration-500 ${
                  theme === 'light' ? 'text-gray-700' : 'text-white/80'
                }`}
              >
                {JSON.stringify(serverResponse, null, 2)}
              </pre>
            </motion.div>
          )}

          {/* Tooltip for Mind Map Nodes */}
          <div
            ref={tooltipRef}
            className="absolute pointer-events-none text-xs rounded py-1 px-2 opacity-0 transition-opacity duration-300 z-50"
            style={{
              position: 'absolute',
              backgroundColor: theme === 'light' ? '#f9f9f9' : '#333',
              color: theme === 'light' ? '#222' : '#fff',
              backdropFilter: 'blur(4px)',
              padding: '4px 8px',
            }}
          ></div>

          {/* D3 Mind Map Container */}
          <motion.div
            className={`mt-8 w-full h-96 relative rounded-xl overflow-hidden border transition-colors duration-500 ${
              theme === 'light'
                ? 'border-gray-200 bg-white/40 backdrop-blur-md'
                : 'border-white/10 bg-black/30'
            }`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <svg ref={d3Container} className="w-full h-full" />
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreateMapPage;
