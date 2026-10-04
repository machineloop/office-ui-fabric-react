export const assertAbsentOrLiveActiveDescendant = (element: HTMLElement): void => {
  const id = element.getAttribute('aria-activedescendant');
  const target = id ? element.ownerDocument.getElementById(id) : null;
  expect(
    id === null || (target !== null && element.contains(target)),
    `aria-activedescendant=${id} must reference a live option`,
  ).to.equal(true);
};
