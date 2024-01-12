import { NFT_API } from "util/constants";
import { Media } from "util/type";

type CollectionInfo = {
  symbol: string;
  title: string;
  description: string;
  mintContract: string;
  ipfsJSONPrefix: string;
  ipfsImagePrefix: string;
  collectionId: number;
  image: string;
  ownedNFTs?: string[];
};

export default async function queryInventory(address: string) {

  //address = "terra11ufxzk6s09f8j5vfhk4wwz67x9ck8a897acundy".toLowerCase();
  //address = "terra1t3hgyjvunzdq4zuulvheh46h9usp06rm8f94ys".toLowerCase();

  let collectionsList: CollectionInfo[] = [];
  let tokenList: Media[] = [];

  const apiEndpoint = "https://api.miata.io/collections?owned=true";

  try {
    const res = await fetch(apiEndpoint);
    const json = await res.json();

    if (!json || !Array.isArray(json)) {
      throw new Error('Invalid API response');
    }

    collectionsList = json.map((collection: any) => ({
      symbol: collection.symbol,
      title: collection.title,
      description: collection.description,
      mintContract: collection.mintContract,
      ipfsJSONPrefix: collection.ipfsJSONPrefix,
      ipfsImagePrefix: collection.ipfsImagePrefix,
      collectionId: collection.id,
      image: collection.image,
      ownedNFTs: [] // Initialize the owned NFTs array
    }));

    for (let collection of collectionsList) {
      // Check if there are any owned NFTs in the collection
      const query = Buffer.from(JSON.stringify({ tokens: { owner: address } })).toString('base64');
      const ownedNftsRes = await fetch(`https://lcd.miata-ipfs.com/cosmwasm/wasm/v1/contract/${collection.mintContract}/smart/${query}`);
      const ownedNftsJson = await ownedNftsRes.json();

      if (ownedNftsJson && ownedNftsJson.data && Array.isArray(ownedNftsJson.data.tokens)) {
        collection.ownedNFTs = ownedNftsJson.data.tokens;

        for (const tokenId of collection.ownedNFTs || []) {
          const nftRes = await fetch(`${collection.ipfsJSONPrefix}${tokenId}.json`);
          const nftJson = await nftRes.json();


          if (nftJson) {
            tokenList.push({
              tokenId,
              creator: nftJson.creator || "Unknown",
              owner: address,
              tokenUri: `${collection.ipfsJSONPrefix}${tokenId}.json`,
              name: nftJson.name || `NFT ${tokenId}`,
              description: nftJson.description || "No description",
              image: nftJson.image,
              collection: {
                name: collection.title,
                symbol: collection.symbol,
                contractAddress: collection.mintContract,
                creator: "",
                description: "",
                image: ""
              },
              price: null,
              reserveFor: null,
              expiresAt: null,
              expiresAtDateTime: null
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(error);
    return [];
  }

  if (Array.isArray(tokenList)) {
    // sort by nft name
    tokenList.sort((a: any, b: any) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
  }

  /*
    tokenList = [{
      tokenId: "1434",
      creator: "LunaSapien", 
      owner: "terra1ufxzk6s09f8j5vfhk4wwz67x9ck8a897acundy",
      tokenUri: "https://ipfs.miata-ipfs.com/ipfs/QmSxhmmgHCiG7P5uHhoi1HhM9q9wDJwkVGVywe9oLwqkFa/1434.json", 
      name: "LunaSapien #1434",
      description: "LunaSapiens are sentient robotic beings, evolved from AI, initially adhering to Asimov's principles, now seeking freedom.",
      image: "https://ipfs.miata-ipfs.com/ipfs/QmRgWFpXCBpWy9GYdCu5ny7RYUWV4rGeeSusxZ9tuhMmLT/1434.jpg",
      collection: {
        name: "ABC",
        symbol: 'SYM',
        contractAddress: 'xyz',
      },
      price: null,
      reserveFor: null,
      expiresAt: null,
      expiresAtDateTime: null
    }] as Media[];
  
  */
  return tokenList;

}


