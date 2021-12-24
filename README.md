# Installation and launch

1. Download the project

2. Install Node.JS and run **npm install** command in the project directory

3. Clone **_user_config.json** file, name it **user_config.json** and set 4 parameters there:
    - **rpcAddress** in **ethNode** - **Ethereum Main Net** RPC address, it may be a full or light node installed locally, Infura node or any public node RPC;
    - **rpcAddress** in **bscNode** - **Binance Smart Chain** RPC address. Binance public RPC by default;
    - **privateKey** in **ethNode** and **bscNode** - arbitrator's account private key for **Ethereum Main Net** and **Binance Smart Chain**, it may be one or two different private keys. Each account must have ETH/BNB and HASH tokens for the node working. If you export your key from Metamask, you need to add "0x" at the beginning of the string.

4. Run the node: **npm start**