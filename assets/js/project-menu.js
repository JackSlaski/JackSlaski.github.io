'use strict';

/*
	Change this to:
	'highlight' to highlight the current page.
	'hide' to remove the current page from the dropdown.
	'show' to show it normally.
*/
const currentProjectBehaviour = 'highlight';

/*
	This is now the only place where the dropdown projects
	need to be added, removed, renamed or reorganised.
*/
const projectMenuGroups = [
	{
		title: 'Active Projects',
		projects: [
			{
				name: 'Recoil Works',
				href: 'recoilworks.html'
			},
			{
				name: 'Arms & Assets',
				href: 'armsandassets.html'
			}
		]
	},
	{
		title: 'Postgraduate Projects',
		projects: [
			{
				name: 'Gerbert Games',
				href: 'gerbertgames.html'
			},
			{
				name: 'Survivors Like',
				href: 'survivorslike.html'
			},
			{
				name: 'Formula and Flask',
				href: 'formandflask.html'
			},
			{
				name: 'Loot Box Ethics',
				href: 'lootbox.html'
			}
		]
	},
	{
		title: 'Undergraduate Projects',
		projects: [
			{
				name: 'Feudal Living',
				href: 'flgame.html'
			},
			{
				name: "Leviathan's Gauntlet",
				href: 'lggame.html'
			},
			{
				name: 'Do You Know Ball?',
				href: 'dykbgame.html'
			},
			{
				name: 'Cave Generation Tool',
				href: 'cavegen.html'
			},
			{
				name: 'Wild Magic',
				href: 'wmgame.html'
			},
			{
				name: 'UI Showcase',
				href: 'uishow.html'
			},
			{
				name: 'FYP Work',
				href: 'uidiss.html'
			}
		]
	}
];

function buildProjectDropdown() {
	const menu = document.getElementById('project-dropdown-menu');

	/*
		Stops the script if this page does not contain
		the project dropdown.
	*/
	if (!menu) {
		return;
	}

	const currentFile = decodeURIComponent(
		window.location.pathname.split('/').pop() || ''
	).toLowerCase();

	const dropdown = menu.parentElement;
	const projectsButton = dropdown
		? dropdown.querySelector('a')
		: null;

	let currentProjectFound = false;

	/*
		Clears anything currently inside the menu before
		constructing the shared version.
	*/
	menu.replaceChildren();

	projectMenuGroups.forEach((group) => {
		const sectionHeading = document.createElement('li');

		sectionHeading.classList.add('dropdown-section-title');
		sectionHeading.textContent = group.title;

		menu.appendChild(sectionHeading);

		group.projects.forEach((project) => {
			const isCurrentPage =
				project.href.toLowerCase() === currentFile;

			if (isCurrentPage) {
				currentProjectFound = true;
			}

			if (
				isCurrentPage &&
				currentProjectBehaviour === 'hide'
			) {
				return;
			}

			const listItem = document.createElement('li');
			const link = document.createElement('a');

			link.href = project.href;
			link.textContent = project.name;

			if (
				isCurrentPage &&
				currentProjectBehaviour === 'highlight'
			) {
				link.classList.add('active');
				link.setAttribute('aria-current', 'page');
			}

			listItem.appendChild(link);
			menu.appendChild(listItem);
		});
	});

	/*
		Highlights the main Projects button whenever the
		user is currently viewing a project page.
	*/
	if (currentProjectFound && projectsButton) {
		projectsButton.classList.add('active');
	}
}

if (document.readyState === 'loading') {
	document.addEventListener(
		'DOMContentLoaded',
		buildProjectDropdown
	);
} else {
	buildProjectDropdown();
}