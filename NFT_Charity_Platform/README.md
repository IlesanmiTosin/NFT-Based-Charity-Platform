# NFT-Based Charity Platform Smart Contract

This smart contract enables the creation, trade, and donation of NFTs while incorporating a built-in mechanism to support charities and manage charitable campaigns. It is designed to facilitate contributions to charitable causes using NFTs.

---

## Features

### Core NFT Functionality
- **Mint NFTs**: Users can mint unique NFTs with metadata.
- **Transfer NFTs**: Owners can transfer their NFTs to other users.
- **List NFTs for Sale**: Owners can list their NFTs for sale at a specified price.

### Charitable Contributions
- **Charity Donations via Marketplace**: A percentage of NFT sales is automatically donated to a charity address.
- **Charity Campaigns**: The contract supports the creation and management of charity fundraising campaigns.

### Administrative Control
- **Set Charity Address**: Change the address receiving donations.
- **Set Donation Percentage**: Adjust the percentage of sales donated to charity.
- **Pause/Unpause Contract**: Temporarily disable contract functions for maintenance or updates.
- **End Campaigns**: Deactivate expired or completed charity campaigns.

---

## Data Variables

### Contract State Variables
- `total-nfts`: Total number of NFTs minted.
- `charity-address`: Address where donation funds are sent.
- `donation-percentage`: Percentage of NFT sales donated to charity.
- `total-donations`: Total STX donated through the platform.
- `paused`: Boolean to control contract functionality.

### NFT-Related Maps
- `nft-owners`: Maps NFT IDs to their owners.
- `token-uri`: Maps NFT IDs to their metadata URIs.
- `nft-price`: Maps NFT IDs to their listed prices.
- `nft-metadata`: Stores additional metadata for each NFT, including creator, timestamp, and category.

### Charity Campaign Maps
- `charity-campaigns`: Stores details of all charity campaigns.
- `user-donations`: Tracks user contributions to specific campaigns.

---

## Public Functions

### NFT Core Functions
- `mint(uri, category)`: Mint a new NFT with a metadata URI and category.
- `transfer(token-id, recipient)`: Transfer ownership of an NFT.
- `list-for-sale(token-id, price)`: List an NFT for sale at a specified price.

### Marketplace and Charity Functions
- `buy-nft(token-id)`: Purchase an NFT, transferring a portion of the sale to charity.
- `donate-to-campaign(campaign-id, amount)`: Donate directly to a specified charity campaign.

### Charity Campaign Management
- `create-charity-campaign(name, description, goal, duration)`: Create a new charity campaign.
- `end-campaign(campaign-id)`: Deactivate a campaign.

### Administrative Functions
- `set-charity-address(new-address)`: Update the charity address.
- `set-donation-percentage(new-percentage)`: Update the donation percentage (max 100%).
- `toggle-pause()`: Pause or resume the contract.

---

## Read-Only Functions
- `get-token-uri(token-id)`: Fetch the metadata URI of a token.
- `get-owner(token-id)`: Get the owner of a token.
- `get-price(token-id)`: Fetch the sale price of a token.
- `get-token-metadata(token-id)`: Retrieve token metadata.
- `get-campaign-details(campaign-id)`: Fetch details of a charity campaign.
- `get-user-donation-history(user, campaign-id)`: Retrieve a user’s donation history for a campaign.

---

## Error Codes
- `u100`: Only the contract owner can perform this action.
- `u101`: Caller is not the owner of the token.
- `u102`: Listing has expired.
- `u103`: Invalid price.
- `u104`: Campaign not found or invalid parameters.
- `u105`: Campaign expired.
- `u106`: Insufficient funds for the transaction.
- `u107`: Invalid parameter passed to the function.
- `u108`: Contract is paused.

---

## How It Works

1. **Mint NFTs**:
   - Call the `mint` function with the desired URI and category to create an NFT.
   - The NFT is assigned a unique ID and registered under the caller’s ownership.

2. **List NFTs for Sale**:
   - Use the `list-for-sale` function to list an NFT at a specified price.
   - Buyers can purchase the NFT using the `buy-nft` function.

3. **Charity Integration**:
   - A portion of each NFT sale is automatically donated to the `charity-address`.
   - Donations can also be made directly to specific charity campaigns.

4. **Manage Campaigns**:
   - Admins can create, update, and end charity campaigns using the respective functions.
   - Users can view campaign details or contribute directly.

---

## Administrative Responsibilities
- Regularly update the `charity-address` to ensure funds are directed to the right place.
- Adjust the `donation-percentage` based on organizational needs.
- Pause the contract if required to prevent misuse or during upgrades.

---

## Future Enhancements
- Adding support for multi-charity donations.
- Integrating on-chain voting for charity selection.
- Expanding metadata options for more detailed NFTs.

---

## License
This smart contract is open-source and licensed under the MIT License.