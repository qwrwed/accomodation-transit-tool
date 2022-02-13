// https://github.com/mui-org/material-ui/issues/17407#issuecomment-969029758

export default {
  id: "0",
  name: "Parent",
  children: [
    {
      id: "1",
      name: "Child - 1",
    },
    {
      id: "3",
      name: "Child - 3",
      children: [
        {
          id: "4",
          name: "Child - 4",
          children: [
            {
              id: "7",
              name: "Child - 7",
            },
            {
              id: "8",
              name: "Child - 8",
            },
          ],
        },
      ],
    },
    {
      id: "5",
      name: "Child - 5",
      children: [
        {
          id: "6",
          name: "Child - 6",
        },
      ],
    },
    {
      id: "9",
      name: "Child - 9",
      children: [
        {
          id: "10",
          name: "Child - 10",
          children: [
            {
              id: "11",
              name: "Child - 11",
            },
            {
              id: "12",
              name: "Child - 12",
            },
          ],
        },
      ],
    },
  ],
} as RenderTree;
