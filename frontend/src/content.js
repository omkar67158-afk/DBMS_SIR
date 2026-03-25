export const courseQuestions = [
  { 
    id: 1, 
    title: "Step 1: Extract the Raw Data",
    question: "Have you successfully downloaded and extracted the 'Global Data on Sustainable Energy' CSV file from Kaggle?", 
    requirement: "Please upload a screenshot of your VS Code workspace or file explorer clearly showing the 'data.csv' file.",
    guide: `### Objective: Acquire the Raw Data
The foundation of any data pipeline is the data itself. For this course, we are utilizing a massive aggregated dataset containing global energy metrics.

**Detailed Execution Steps:**
1. Open your browser and navigate to the [Global Data on Sustainable Energy dataset on Kaggle](https://www.kaggle.com/datasets/anshtanwar/global-data-on-sustainable-energy).
2. Directly download the \`.csv\` data file (no need to extract from a zip).
3. Locate the downloaded file in your computer's \`Downloads\` folder.
4. Select the file, press \`F2\`, and rename it exactly to **\`data.csv\`**.
5. Create a new folder on your Desktop named \`DataPipelineProject\`. Move \`data.csv\` into this folder.

> [!WARNING]
> **Troubleshooting:**
> If you cannot see the \`.csv\` extension, enable "File name extensions" under the View tab in Windows File Explorer.`
  },
  { 
    id: 2, 
    title: "Step 2: Engineer Workstation Setup",
    question: "Have you successfully installed Node.js, Git, and Visual Studio Code?", 
    requirement: "Upload a screenshot of your VS Code terminal returning version numbers for 'node -v' and 'git --version'.",
    guide: `### Objective: Prepare Your Developer Environment
Data engineers rely on robust tooling. We will use Node.js to execute our streaming ETL pipeline.

**Required Installations:**
*   **Node.js:** Download the **LTS** version from [Nodejs.org](https://nodejs.org/). Run the installer, accept all defaults, and ensure "Add to PATH" is checked.
*   **Git:** Download from [Git-scm.com](https://git-scm.com/).
*   **VS Code:** Download from [code.visualstudio.com](https://code.visualstudio.com/).

**Verification Sequence:**
Open your VS Code application. Open a new Terminal by pressing \`Ctrl + \`~ \`. Run these exact commands:
\`\`\`bash
node -v
git --version
\`\`\`

> [!CAUTION]
> **Command Not Found Error?**
> If your terminal says "command not found" after installing Node.js, you must completely restart your computer so the system's PATH variables can refresh.`
  },
  { 
    id: 3, 
    title: "Step 3: Provision MongoDB Atlas",
    question: "Have you created your Free Tier MongoDB Atlas cluster and generated database credentials?", 
    requirement: "Upload a screenshot showing your active cluster dashboard in the MongoDB Atlas console.",
    guide: `### Objective: Deploy a Cloud Database
We will store our thousands of records in a NoSQL cloud database hosted on AWS.

**Step-by-Step Configuration:**
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and sign up.
2. Under "Deploy a cloud database", select the **M0 Free Tier** cluster.
3. Choose **AWS** as your provider and pick the region closest to your physical location. Click **Create Deployment**.
4. **Security Checkpoint (Do Not Skip):**
    *   You will be asked to create a Database User. 
    *   Set the Username to \`admin\` and click **Autogenerate Secure Password**.
    *   **CRITICAL: Copy that password completely and paste it into a safe Notepad file immediately. You will never see it again.**

> [!NOTE]
> MongoDB Atlas may take 1-3 minutes to physically provision the servers. Be patient until the status turns green.`
  },
  { 
    id: 4, 
    title: "Step 4: Network Security Configuration",
    question: "Have you explicitly configured your Network Access to 0.0.0.0/0 to allow connections?", 
    requirement: "Upload a screenshot of the 'Network Access' tab in Atlas showing 0.0.0.0/0 with an 'Active' status.",
    guide: `### Objective: Overcome the Firewall
By default, MongoDB Atlas blocks all incoming connections. We must explicitly whitelist an IP address to allow our Node.js script to insert data.

**Configuration Steps:**
1. Look at the left sidebar menu in your MongoDB Atlas dashboard.
2. Scroll down to the **Security** section and click on **Network Access**.
3. Click the green **+ ADD IP ADDRESS** button in the top right.
4. Click the button that says **ALLOW ACCESS FROM ANYWHERE**. This will automatically fill the box with \`0.0.0.0/0\`.
5. Click **Confirm**.

> [!WARNING]
> **Pending Status?**
> You will notice the status says "Pending". You must wait about 30 to 60 seconds. Do not proceed until the status turns to a green "Active".`
  },
  { 
    id: 5, 
    title: "Step 5: Initialize the Node Project",
    question: "Have you initialized NPM and installed the required dependencies (mongodb, csv-parser, dotenv)?", 
    requirement: "Upload a screenshot of your VS Code terminal showing the 'npm install' success logs — make sure the command includes mongodb, csv-parser, AND dotenv.",
    guide: `### Objective: Construct the Project Foundation
We must turn our empty folder into a recognized Node.js application and download third-party community packages for CSV stream parsing.

**1. Open Your Project:**
In VS Code, go to File > Open Folder, and select your \`DataPipelineProject\` folder from Step 1.

**2. Initialize Node:**
Open your VS Code terminal (\`Ctrl + \`~ \`) and type exactly:
\`\`\`bash
npm init -y
\`\`\`
*(This instantly creates a \`package.json\` configuration file).*

**3. Install All Three Dependencies (Required):**
You need exactly **three** libraries. Copy and paste this complete command:
\`\`\`bash
npm install mongodb csv-parser dotenv
\`\`\`
*Do NOT split this into separate commands. All three must be installed together!*

> [!IMPORTANT]
> **Why \`dotenv\`?**
> The \`dotenv\` package reads your \`.env\` file and loads the \`MONGO_URI\` password into your script. If you skip it, your script will immediately crash with \`Error: Cannot find module 'dotenv'\`. You must install it along with \`mongodb\` and \`csv-parser\` in the same command.

> [!TIP]
> \`csv-parser\` is a streaming library optimized for massive files. It processes the CSV line-by-line without overloading your RAM.`
  },
  { 
    id: 6, 
    title: "Step 6: Secure Credentials (.env)",
    question: "Have you retrieved your Non-SRV connection string from MongoDB Atlas and placed it in your .env file?", 
    requirement: "Upload a screenshot of your VS Code editor showing the active .env file containing your MONGO_URI. For security, please obscure or hide your password in the screenshot.",
    guide: `### Objective: Get the Non-SRV Connection String

Many college networks block the DNS resolution required by the standard \`mongodb+srv://\` connection string. We will use the **Non-SRV** format instead, which always works.

**1. Open Your MongoDB Atlas Connect Page:**
*   Go to [MongoDB Atlas](https://cloud.mongodb.com) and log in.
*   On the **Database** page, click the **Connect** button next to your cluster.

**2. Select Drivers:**
*   In the popup, click **Drivers**.
*   Under "Select your driver", choose **Node.js**.

**3. Switch to Non-SRV:**
*   Below the connection string, you will see a toggle or link that says **"Non-SRV"** or **"Standard connection string"**. Click it.

> [!IMPORTANT]
> This is the key step. The standard connection string begins with \`mongodb+srv://\`. The Non-SRV string begins with just \`mongodb://\` and contains two or three hostnames separated by commas. Make sure you are copying the **Non-SRV** version.

**4. Copy the Non-SRV String:**
It will look like this (longer, with multiple hosts):
\`\`\`
mongodb://admin:<password>@cluster0-shard-00-00.abcde.mongodb.net:27017,cluster0-shard-00-01.abcde.mongodb.net:27017,cluster0-shard-00-02.abcde.mongodb.net:27017/?ssl=true&replicaSet=atlas-xyz-shard-0&authSource=admin&retryWrites=true&w=majority
\`\`\`

**5. Build the .env File:**
*   In VS Code, create a new file named exactly **\`.env\`**.
*   Paste the Non-SRV string inside like this:
\`\`\`env
MONGO_URI=mongodb://admin:YOUR_PASSWORD_HERE@cluster0-shard-00-00.abcde.mongodb.net:27017,.../?ssl=true&authSource=admin
\`\`\`
*   **CRITICAL:** Replace \`<password>\` with your real password. Delete the \`<\` and \`>\` brackets entirely.

> [!CAUTION]
> **Screenshot Security Warning:**
> When submitting your screenshot, **DO NOT** show your real password! Replace your password with stars \`(***)\` before taking the screenshot. The AI grader only needs to see the \`MONGO_URI=mongodb://\` prefix.`
  },
  { 
    id: 7, 
    title: "Step 7: The Data Pipeline ETL Code",
    question: "Have you created the import_csv.js file and pasted the enterprise pipeline code perfectly?", 
    requirement: "Upload a screenshot of your VS Code containing the completed import_csv.js file logic.",
    guide: `### Objective: Implement the Pipeline Logic
You are now ready to write the script that pulls data from the CSV, transforms it into JSON objects, and pushes it to the cloud.

**1. Create the File:**
In VS Code, create a new file named exactly **\`import_csv.js\`**.

**2. Copy & Paste the Enterprise Code:**
Copy the code below exactly as it is, and paste it into \`import_csv.js\`:

\`\`\`javascript
require('dotenv').config();
const fs = require('fs');
const csv = require('csv-parser');
const { MongoClient } = require('mongodb');

// Verify connection string exists
if (!process.env.MONGO_URI) throw new Error("Missing MONGO_URI in .env");

const client = new MongoClient(process.env.MONGO_URI);
const results = [];

async function runETL() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await client.connect();
    const db = client.db('energy_database');
    const collection = db.collection('global_stats');

    console.log("Connected. Reading data.csv via ReadStream...");

    // Stream the CSV file to prevent memory crashes
    fs.createReadStream('data.csv')
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(\`Successfully parsed \${results.length} rows. Uploading...\`);
        
        // Bulk insert records
        await collection.insertMany(results);
        console.log("Data import completed successfully!");
        
        await client.close();
      });

  } catch (error) {
    console.error("ETL Pipeline Error:", error);
    await client.close();
  }
}

runETL();
\`\`\`
Make sure to press \`Ctrl + S\` to save the file!`
  },
  { 
    id: 8, 
    title: "Step 8: Execution & Final Verification",
    question: "Have you successfully executed the script and visually verified the collections in MongoDB Atlas?", 
    requirement: "Upload a screenshot of the MongoDB Atlas 'Collections' view showing the 'energy_database' completely populated with your records.",
    guide: `### Objective: Ignite the Pipeline
It is time to run the code. If your \`.env\` is typed correctly, your IP is whitelisted, and your \`data.csv\` is in the root folder, the script will execute perfectly.

**1. Run the Script:**
Open your VS Code terminal and execute:
\`\`\`bash
node import_csv.js
\`\`\`

**2. Monitor Output:**
You should see:
> \`Connecting to MongoDB Atlas...\`
> \`Connected. Reading data.csv via ReadStream...\`
> \`Successfully parsed 3000 rows. Uploading...\`
> \`Data import completed successfully!\`

**3. The Final Validation:**
*   Return to your browser and open **MongoDB Atlas**.
*   Click the **Browse Collections** button next to your cluster.
*   In the sidebar, look for **energy_database**. Click on the **global_stats** collection inside it.
*   You should see all your freshly transformed JSON documents sitting safely in the cloud!

> [!CAUTION]
> **Module Not Found: dotenv?**
> If the script crashes saying \`Error: Cannot find module 'dotenv'\`, it means you skipped the installation step! Run \`npm install mongodb csv-parser dotenv\` in your terminal right now, then try running the script again.

> [!CAUTION]
> **ENOENT File Error?**
> If the script crashes saying \`Error: ENOENT: no such file or directory, open 'data.csv'\`, it means you forgot to rename the downloaded kaggle file to \`data.csv\`, or it is hidden inside another folder. Move it to the exact same folder as \`import_csv.js\`.`
  }
];
