const { resolve, relative } = require("path");
const { readdir, readFile, writeFile } = require("fs").promises;

const path = resolve(__dirname, "../crosswords");
const out = resolve(__dirname, "../../dist");

async function* getFiles(directory) {
  const dirents = await readdir(directory, { withFileTypes: true });
  for (const dirent of dirents) {
    const path = resolve(directory, dirent.name);
    if (dirent.isDirectory()) {
      yield* getFiles(path);
    } else {
      yield path;
    }
  }
}

function findWordIndex(word, array) {
  let wordIndex = 0;
  let startIndex = -1;

  for (let i = 0; i < array.length; ++i) {
    if (array[i] === word[wordIndex]) {
      if (startIndex === -1) {
        startIndex = i;
      }

      ++wordIndex;

      if (wordIndex === word.length) {
        return startIndex;
      }
    } else {
      startIndex = -1;
      wordIndex = 0;
    }
  }

  return -1;
}

function createIndex(answers, grid, gridnums) {
  const index = [];

  answers.forEach((word) => {
    const wordIndex = findWordIndex(word, grid);
    const gridIndex = gridnums[wordIndex];

    index.push(word, gridIndex);
  });

  return index;
}

function createGrid(puzzle) {
  const grid = [];

  let index = 0;
  for (let row = 0; row < puzzle.size.rows; row++) {
    grid[row] = [];
    for (let col = 0; col < puzzle.size.cols; col++) {
      grid[row][col] = puzzle.grid[index++];
    }
  }

  return grid;
}

function parseGridAcross(grid, puzzle) {
  const a = [];

  puzzle.answers.across.forEach((word) => {
    for (let row = 0; row < puzzle.size.rows; row++) {
      const rowData = [];

      for (let col = 0; col < puzzle.size.cols; col++) {
        rowData.push(grid[row][col]);
      }

      const columnIndex = findWordIndex(word, rowData);
      if (columnIndex > -1) {
        const gridIndex = columnIndex + row * puzzle.size.cols;
        a.push(word, gridIndex);
        break;
      }
    }
  });

  return a;
}

function parseGridDown(grid, puzzle) {
  const d = [];

  puzzle.answers.down.forEach((word) => {
    for (let col = 0; col < puzzle.size.rows; col++) {
      const columnData = [];

      for (let row = 0; row < puzzle.size.cols; row++) {
        columnData.push(grid[row][col]);
      }

      const rowIndex = findWordIndex(word, columnData);
      if (rowIndex > -1) {
        const gridIndex = col + rowIndex * puzzle.size.rows;
        d.push(word, gridIndex);
        break;
      }
    }
  });

  return d;
}

// Convert the crossword JSON into the following format:
// export const crossword = () => ({
//   a: ["two", 0],
//   d: ["one", 2],
//   s: 3,
// });
async function parseFile(filePath) {
  let file;
  try {
    file = await readFile(filePath, "utf8");
  } catch (error) {
    return Promise.reject(
      `There was a problem reading the file: ${filePath}\n${error}`
    );
  }

  let json;
  try {
    json = JSON.parse(file);
  } catch (error) {
    return Promise.reject(
      `There was a problem parsing the file: ${filePath}\n${error}`
    );
  }

  const grid = createGrid(json);

  const a = parseGridAcross(grid, json);
  const d = parseGridDown(grid, json);
  const s = json.size.cols;

  return { a, d, s };
}

const main = async () => {
  for await (const file of getFiles(path)) {
    let data;
    try {
      data = await parseFile(file);

      const jsonString = JSON.stringify(data);
      const filePath = resolve(out, relative(path, file).replace(/\\/g, "-"));

      await writeFile(filePath, jsonString);
    } catch (error) {
      console.log(error);
    }
  }
};

main();
