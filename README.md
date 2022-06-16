# Installation and launch

1. Download the project

2. Install Node.JS and run **npm install** command in the project directory

3. Clone **_user_config.json** file, name it **user_config.json** and set parameters for each chain (1 - Ethereum, 56 - BSC, 137 - Polygon):
    - **rpcAddress** - RPC address, it may be a full or light node installed locally, Infura node or any public node RPC. Public RPC by default;
    - **privateKey** - arbitrator's account private key, it may be one or different private keys. Each account must have ETH/BNB/MATIC and HASH tokens for the node working. If you export your key from Metamask, you need to add "0x" at the beginning of the string.

4. Run the node: **npm start**