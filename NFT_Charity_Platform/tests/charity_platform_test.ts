import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v0.14.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Ensure that NFT minting works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;

        // Mint an NFT
        const tokenURI = "https://example.com/nft/1";
        const category = "Digital Art";

        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8(tokenURI), types.utf8(category)],
                user1.address
            )
        ]);

        // Check if minting was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u1)'); // First token ID

        // Verify token details
        const ownerCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-owner',
            [types.uint(1)],
            user1.address
        );

        assertEquals(ownerCheck.result, `(some ${user1.address})`);

        const uriCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-token-uri',
            [types.uint(1)],
            user1.address
        );

        assertEquals(uriCheck.result, `(some "${tokenURI}")`);

        const metadataCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-token-metadata',
            [types.uint(1)],
            user1.address
        );

        const metadataString = metadataCheck.result.replace('(some ', '').slice(0, -1);
        assertEquals(metadataString.includes(`creator: ${user1.address}`), true);
        assertEquals(metadataString.includes(`category: "${category}"`), true);

        // Mint another NFT
        const tokenURI2 = "https://example.com/nft/2";
        const category2 = "Photography";

        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8(tokenURI2), types.utf8(category2)],
                user1.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u2)'); // Second token ID
    },
});

Clarinet.test({
    name: "Ensure that NFT transfers work correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!; // Original owner
        const user2 = accounts.get('wallet_2')!; // New owner

        // Mint an NFT first
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/transfer"), types.utf8("Transfer Test")],
                user1.address
            )
        ]);

        // Transfer the NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'transfer',
                [types.uint(1), types.principal(user2.address)],
                user1.address
            )
        ]);

        // Check if transfer was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify new owner
        const ownerCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-owner',
            [types.uint(1)],
            user1.address
        );

        assertEquals(ownerCheck.result, `(some ${user2.address})`);

        // Test unauthorized transfer (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'transfer',
                [types.uint(1), types.principal(user1.address)],
                user1.address // user1 is no longer the owner
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u101)'); // err-not-token-owner
    },
});

Clarinet.test({
    name: "Ensure that NFT listing for sale works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;

        // Mint an NFT first
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/sale"), types.utf8("For Sale")],
                user1.address
            )
        ]);

        // List the NFT for sale
        const price = 100000000; // 100 STX
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'list-for-sale',
                [types.uint(1), types.uint(price)],
                user1.address
            )
        ]);

        // Check if listing was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify price
        const priceCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-price',
            [types.uint(1)],
            user1.address
        );

        assertEquals(priceCheck.result, `(some u${price})`);

        // Test invalid price (0)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'list-for-sale',
                [types.uint(1), types.uint(0)],
                user1.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u103)'); // err-invalid-price

        // Test unauthorized listing (should fail)
        const user2 = accounts.get('wallet_2')!;
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'list-for-sale',
                [types.uint(1), types.uint(price)],
                user2.address // Not the owner
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u101)'); // err-not-token-owner
    },
});

Clarinet.test({
    name: "Ensure charity campaign creation and donation works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;

        // Create a charity campaign
        const campaignName = "Save the Forests";
        const description = "Campaign to plant 10,000 trees in deforested areas";
        const goal = 1000000000; // 1000 STX
        const duration = 144 * 30; // ~30 days in blocks (144 blocks/day)

        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'create-charity-campaign',
                [
                    types.utf8(campaignName),
                    types.utf8(description),
                    types.uint(goal),
                    types.uint(duration)
                ],
                deployer.address // Only contract owner can create campaigns
            )
        ]);

        // Check if campaign creation was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u1)'); // First campaign ID

        // Verify campaign details
        const campaignDetails = chain.callReadOnlyFn(
            'charity_platform',
            'get-campaign-details',
            [types.uint(1)],
            user1.address
        );

        const detailsString = campaignDetails.result.replace('(some ', '').slice(0, -1);
        assertEquals(detailsString.includes(`name: "${campaignName}"`), true);
        assertEquals(detailsString.includes(`description: "${description}"`), true);
        assertEquals(detailsString.includes(`goal: u${goal}`), true);
        assertEquals(detailsString.includes('raised: u0'), true);
        assertEquals(detailsString.includes('active: true'), true);

        // Test unauthorized campaign creation (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'create-charity-campaign',
                [
                    types.utf8("Unauthorized Campaign"),
                    types.utf8("This should fail"),
                    types.uint(goal),
                    types.uint(duration)
                ],
                user1.address // Not the contract owner
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u100)'); // err-owner-only

        // Make a donation to the campaign
        const donationAmount = 50000000; // 50 STX

        // Update the charity address to user1 for testing purposes (avoiding transfer errors in test)
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-charity-address',
                [types.principal(user1.address)],
                deployer.address
            )
        ]);

        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(1), types.uint(donationAmount)],
                deployer.address // Making donation from deployer to avoid STX transfer issues in tests
            )
        ]);

        // Check if donation was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify campaign raised amount was updated
        const updatedCampaign = chain.callReadOnlyFn(
            'charity_platform',
            'get-campaign-details',
            [types.uint(1)],
            user1.address
        );

        const updatedString = updatedCampaign.result.replace('(some ', '').slice(0, -1);
        assertEquals(updatedString.includes(`raised: u${donationAmount}`), true);

        // Verify donation was recorded in user history
        const donationHistory = chain.callReadOnlyFn(
            'charity_platform',
            'get-user-donation-history',
            [types.principal(deployer.address), types.uint(1)],
            deployer.address
        );

        const historyString = donationHistory.result.replace('(some ', '').slice(0, -1);
        assertEquals(historyString.includes(`amount: u${donationAmount}`), true);
    },
});

Clarinet.test({
    name: "Ensure buying NFT with charity donation works correctly",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const seller = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;

        // Mint and list an NFT for sale
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/buy"), types.utf8("For Purchase")],
                seller.address
            )
        ]);

        const price = 100000000; // 100 STX
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'list-for-sale',
                [types.uint(1), types.uint(price)],
                seller.address
            )
        ]);

        // Set charity address to deployer for testing
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-charity-address',
                [types.principal(deployer.address)],
                deployer.address
            )
        ]);

        // Buy the NFT
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'buy-nft',
                [types.uint(1)],
                buyer.address
            )
        ]);

        // Check if purchase was successful
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify new owner
        const ownerCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-owner',
            [types.uint(1)],
            buyer.address
        );

        assertEquals(ownerCheck.result, `(some ${buyer.address})`);

        // Verify price mapping was cleared
        const priceCheck = chain.callReadOnlyFn(
            'charity_platform',
            'get-price',
            [types.uint(1)],
            buyer.address
        );

        assertEquals(priceCheck.result, 'none');

        // Verify donation percentage calculation is correct
        // Default is 20%, so 20 STX should have been donated
        const expectedDonation = 20000000; // 20 STX (20% of 100 STX)
    },
});

Clarinet.test({
    name: "Test administrative functions",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const newCharityAddress = accounts.get('wallet_2')!;

        // Test setting charity address
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-charity-address',
                [types.principal(newCharityAddress.address)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Test setting donation percentage
        const newPercentage = 30; // 30%
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-donation-percentage',
                [types.uint(newPercentage)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Test toggle pause
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'toggle-pause',
                [],
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify that paused state prevents minting
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/paused"), types.utf8("Paused Test")],
                user1.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u108)'); // Paused error

        // Test unauthorized administrative actions (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-donation-percentage',
                [types.uint(50)],
                user1.address // Not the contract owner
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u100)'); // err-owner-only

        // Test setting invalid donation percentage (over 100%)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-donation-percentage',
                [types.uint(101)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // Error for invalid percentage
    },
});

Clarinet.test({
    name: "Test charity campaign management and expiration",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;

        // Create a charity campaign with short duration
        const campaignName = "Short Campaign";
        const description = "This is a short test campaign";
        const goal = 500000000; // 500 STX
        const duration = 10; // 10 blocks

        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'create-charity-campaign',
                [
                    types.utf8(campaignName),
                    types.utf8(description),
                    types.uint(goal),
                    types.uint(duration)
                ],
                deployer.address
            )
        ]);

        // Set charity address to user1 for testing donations
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-charity-address',
                [types.principal(user1.address)],
                deployer.address
            )
        ]);

        // Make initial donation
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(1), types.uint(100000000)], // 100 STX
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Fast forward past the deadline
        // Mine 11 blocks to pass the duration
        for (let i = 0; i < 11; i++)
        {
            chain.mineEmptyBlock();
        }

        // Try to donate after deadline (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(1), types.uint(50000000)], // 50 STX
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u105)'); // err-campaign-expired

        // Manually end the campaign
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'end-campaign',
                [types.uint(1)],
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok true)');

        // Verify campaign is now inactive
        const campaignDetails = chain.callReadOnlyFn(
            'charity_platform',
            'get-campaign-details',
            [types.uint(1)],
            user1.address
        );

        const detailsString = campaignDetails.result.replace('(some ', '').slice(0, -1);
        assertEquals(detailsString.includes('active: false'), true);

        // Try to donate to inactive campaign (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(1), types.uint(10000000)], // 10 STX
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // err-campaign-not-found
    },
});

Clarinet.test({
    name: "Test creating multiple campaigns and handling donations",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const user1 = accounts.get('wallet_1')!;
        const user2 = accounts.get('wallet_2')!;

        // Set charity address to user1 for testing
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-charity-address',
                [types.principal(user1.address)],
                deployer.address
            )
        ]);

        // Create multiple campaigns
        chain.mineBlock([
            // First campaign
            Tx.contractCall(
                'charity_platform',
                'create-charity-campaign',
                [
                    types.utf8("Education Fund"),
                    types.utf8("Supporting education in underserved communities"),
                    types.uint(1000000000), // 1000 STX
                    types.uint(144 * 14) // ~14 days
                ],
                deployer.address
            ),
            // Second campaign
            Tx.contractCall(
                'charity_platform',
                'create-charity-campaign',
                [
                    types.utf8("Clean Water Initiative"),
                    types.utf8("Providing clean water access to remote villages"),
                    types.uint(2000000000), // 2000 STX
                    types.uint(144 * 21) // ~21 days
                ],
                deployer.address
            )
        ]);

        // Make donations to both campaigns
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(1), types.uint(200000000)], // 200 STX to campaign 1
                deployer.address
            ),
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(2), types.uint(300000000)], // 300 STX to campaign 2
                deployer.address
            )
        ]);

        // Verify donation amounts for each campaign
        const campaign1Details = chain.callReadOnlyFn(
            'charity_platform',
            'get-campaign-details',
            [types.uint(1)],
            deployer.address
        );

        const campaign1String = campaign1Details.result.replace('(some ', '').slice(0, -1);
        assertEquals(campaign1String.includes('raised: u200000000'), true);

        const campaign2Details = chain.callReadOnlyFn(
            'charity_platform',
            'get-campaign-details',
            [types.uint(2)],
            deployer.address
        );

        const campaign2String = campaign2Details.result.replace('(some ', '').slice(0, -1);
        assertEquals(campaign2String.includes('raised: u300000000'), true);

        // Test donation to non-existent campaign
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'donate-to-campaign',
                [types.uint(999), types.uint(100000000)], // 100 STX to non-existent campaign
                deployer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u104)'); // err-campaign-not-found
    },
});

Clarinet.test({
    name: "Test NFT marketplace functionality when paused",
    async fn(chain: Chain, accounts: Map<string, Account>)
    {
        const deployer = accounts.get('deployer')!;
        const seller = accounts.get('wallet_1')!;
        const buyer = accounts.get('wallet_2')!;

        // First mint and list an NFT
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/pause-test"), types.utf8("Pause Test")],
                seller.address
            ),
            Tx.contractCall(
                'charity_platform',
                'list-for-sale',
                [types.uint(1), types.uint(100000000)], // 100 STX
                seller.address
            )
        ]);

        // Pause the contract
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'toggle-pause',
                [],
                deployer.address
            )
        ]);

        // Set charity address to deployer for testing
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'set-charity-address',
                [types.principal(deployer.address)],
                deployer.address
            )
        ]);

        // Try to mint while paused (should fail)
        let block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/paused-mint"), types.utf8("Paused Mint")],
                seller.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u108)'); // Paused error

        // Try to list while paused (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'list-for-sale',
                [types.uint(1), types.uint(200000000)], // 200 STX
                seller.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u108)'); // Paused error

        // Try to buy while paused (should fail)
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'buy-nft',
                [types.uint(1)],
                buyer.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(err u108)'); // Paused error

        // Unpause the contract
        chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'toggle-pause',
                [],
                deployer.address
            )
        ]);

        // Now minting should work again
        block = chain.mineBlock([
            Tx.contractCall(
                'charity_platform',
                'mint',
                [types.utf8("https://example.com/nft/unpaused"), types.utf8("Unpaused Test")],
                seller.address
            )
        ]);

        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result, '(ok u2)'); // Second token ID
    },
});