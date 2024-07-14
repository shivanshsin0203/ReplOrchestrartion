const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const Docker = require('dockerode');

const app = express();
const docker = new Docker();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
dotenv.config();

const mongoUrl = process.env.mongoUrl;
const databaseConnect = async () => {
    await mongoose.connect(mongoUrl);
};

// Schema for user
const userSchema = new mongoose.Schema({
    email: String,
    projectId: String,
    framework: String,
    isActive: Boolean,
    lastModified: { type: Date, default: Date.now }
});

const User = mongoose.model("user", userSchema);

// Arrays to store port mappings
const portToDockerIdMap = [];
const dockerIdToPortMap = [];

app.listen(3001, async () => {
    console.log("Server Started at " + 3001);
    await databaseConnect();
    console.log("Connected to database");
});

// Function to find available ports
const findAvailablePorts = async () => {
    for (let port3002 = 3002; port3002 <= 3190; port3002++) {
        for (let port8000 = 8000; port8000 <= 8190; port8000++) {
            if (!portToDockerIdMap.some(mapping => mapping.port3002 === port3002 || mapping.port8000 === port8000)) {
                return { port3002, port8000 };
            }
        }
    }
    throw new Error('No available ports');
};
app.post('/stopcontainer', async (req, res) => {
  console.log(req.body.docId)
  const  containerId  = req.body.docId;

  if (!containerId) {
    return res.status(400).json({ error: 'Container ID is required' });
  }

  try {
    const container = docker.getContainer(containerId);

    await container.stop();
    console.log(`Container ${containerId} stopped successfully.`);

    await container.remove();
    console.log(`Container ${containerId} removed successfully.`);

    res.json({ message: `Container ${containerId} stopped and removed successfully.` });
  } catch (err) {
    console.error(`Error stopping or removing container ${containerId}:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/getprojects', async (req, res) => {
    const email = req.body.email;
    const projects = await User.find({ email: email });
    res.json(projects);
});

// New container creation
app.post("/startproject", async (req, res) => {
    console.log(req.body);
    const id = req.body.projectId;
    const email = req.body.email;
    const framework = req.body.framework;
    if(! await User.findOne({ email: email, projectId: id })) {
    await User.create({ email: email, projectId: id,framework: framework, isActive: false,lastModified: Date.now()});}
    const envVars = [
        `mongoUrl=${process.env.mongoUrl}`,
        `AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID}`,
        `AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY}`,
        `AWS_REGION=${process.env.AWS_REGION}`,
        `S3_BUCKET_NAME=${process.env.S3_BUCKET_NAME}`
    ];
    if (framework === 'Node.js') {
        try {
            const { port3002, port8000 } = await findAvailablePorts();

            const container = await docker.createContainer({
                Image: 'replnodeinitial',
                ExposedPorts: {
                    
                    '3002/tcp': {},
                    '8000/tcp': {}
                },
                HostConfig: {
                    PortBindings: {
                        
                        '3002/tcp': [{ HostPort: port3002.toString() }],
                        '8000/tcp': [{ HostPort: port8000.toString() }]
                    }
                },
                Env: envVars
            });

            await container.start();

            const dockerId = container.id;

            portToDockerIdMap.push({ port3002, port8000, dockerId });
            dockerIdToPortMap.push({ dockerId, port3002, port8000 });

            res.json({ 
                message: "Project started successfully", 
                dockerId,
                ports: { port3002, port8000 }
            });
        } catch (error) {
            console.error('Error starting Docker container:', error);
            res.status(500).json({ message: "Error starting project" });
        }
    }
    else if (framework === 'React.js') {
      try {
          const { port3002, port8000 } = await findAvailablePorts();

          const container = await docker.createContainer({
              Image: 'replreactinitial',
              ExposedPorts: {
                  
                  '3002/tcp': {},
                  '5173/tcp': {}
              },
              HostConfig: {
                  PortBindings: {
                      
                      '3002/tcp': [{ HostPort: port3002.toString() }],
                      '5173/tcp': [{ HostPort: port8000.toString() }]
                  }
              },
              Env: envVars
          });

          await container.start();

          const dockerId = container.id;

          portToDockerIdMap.push({ port3002, port8000, dockerId });
          dockerIdToPortMap.push({ dockerId, port3002, port8000 });

          res.json({ 
              message: "Project started successfully", 
              dockerId,
              ports: { port3002, port8000 }
          });
      } catch (error) {
          console.error('Error starting Docker container:', error);
          res.status(500).json({ message: "Error starting project" });
      }
  } 
    else {
        res.json({ message: "Project started successfully" });
    }
});