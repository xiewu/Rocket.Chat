import type { ILivechatDepartment, Serialized } from '@rocket.chat/core-typings';
import { MockedAppRootBuilder } from '@rocket.chat/mock-providers/dist/MockedAppRootBuilder';
import { renderHook, waitFor } from '@testing-library/react';

import { useDepartmentsList } from './useDepartmentsList';
import { createFakeDepartment, generateFakeDepartments } from '../../../../tests/mocks/data';

const formatDepartmentItem = (department: Serialized<ILivechatDepartment>) => ({
	_id: department._id,
	label: department.archived ? `${department.name} [Archived]` : department.name,
	value: department._id,
});

const mockGetDepartments = jest.fn();
const mockGetUnitDepartments = jest.fn();
const mockGetDepartment = jest.fn();

const appRoot = new MockedAppRootBuilder()
	.withTranslations('en', 'core', { All: 'All', None: 'None', Archived: 'Archived' })
	.withEndpoint('GET', '/v1/livechat/department', mockGetDepartments)
	.withEndpoint('GET', '/v1/livechat/units/:unitId/departments/available', mockGetUnitDepartments)
	.withEndpoint('GET', '/v1/livechat/department/:_id', mockGetDepartment);

afterEach(() => {
	jest.clearAllMocks();
});

it('should fetch departments', async () => {
	const departmentsList = generateFakeDepartments(10);
	const departmentItemsMock = departmentsList.map(formatDepartmentItem);

	mockGetDepartments.mockResolvedValueOnce({
		departments: departmentsList,
		count: 10,
		offset: 0,
		total: 10,
	});

	const { result } = renderHook(() => useDepartmentsList({ filter: '' }), { wrapper: appRoot.build() });

	await waitFor(() => expect(result.current.isFetching).toBe(false));

	expect(mockGetDepartment).not.toHaveBeenCalled();
	expect(mockGetUnitDepartments).not.toHaveBeenCalled();
	expect(mockGetDepartments).toHaveBeenCalled();

	expect(result.current.data).toEqual(departmentItemsMock);
});

it('should fetch unit departments when unitId is provided', async () => {
	const unitDepartmentsList = generateFakeDepartments(10);
	const departmentItems = unitDepartmentsList.map(formatDepartmentItem);
	mockGetUnitDepartments.mockResolvedValue({
		departments: unitDepartmentsList,
		count: 5,
		offset: 0,
		total: 5,
	});

	const { result } = renderHook(() => useDepartmentsList({ filter: '', unitId: '123' }), { wrapper: appRoot.build() });

	await waitFor(() => expect(result.current.isFetching).toBe(false));
	expect(mockGetDepartment).not.toHaveBeenCalled();
	expect(mockGetDepartments).not.toHaveBeenCalled();
	expect(mockGetUnitDepartments).toHaveBeenCalled();

	expect(result.current.data).toEqual(departmentItems);
});

it('should format archived departments correctly', async () => {
	mockGetDepartments.mockResolvedValueOnce({
		departments: [createFakeDepartment({ name: 'Test Department', archived: true })],
		count: 1,
		offset: 0,
		total: 1,
	});

	const { result } = renderHook(() => useDepartmentsList({ filter: '' }), { wrapper: appRoot.build() });

	await waitFor(() => expect(result.current.isFetching).toBe(false));
	expect(result.current.data.length).toBe(1);
	expect(result.current.data[0].label).toBe('Test Department [Archived]');
});

it('should include "All" item if haveAll is true', async () => {
	mockGetDepartments.mockResolvedValueOnce({
		departments: generateFakeDepartments(5),
		count: 5,
		offset: 0,
		total: 5,
	});

	const { result } = renderHook(() => useDepartmentsList({ filter: '', haveAll: true }), { wrapper: appRoot.build() });

	await waitFor(() => expect(result.current.isFetching).toBe(false));
	expect(result.current.data[0].label).toBe('All');
});

it('should include "None" item if haveNone is true', async () => {
	mockGetDepartments.mockResolvedValueOnce({
		departments: generateFakeDepartments(5),
		count: 5,
		offset: 0,
		total: 5,
	});

	const { result } = renderHook(() => useDepartmentsList({ filter: '', haveNone: true }), { wrapper: appRoot.build() });

	await waitFor(() => expect(result.current.isFetching).toBe(false));
	expect(result.current.data[0].label).toBe('None');
});

it('should fetch the selected department if selectedDepartmentId is provided', async () => {
	const departmentsList = generateFakeDepartments(10);
	const departmentItems = departmentsList.map(formatDepartmentItem);
	const selectedDepartmentMock = createFakeDepartment({ _id: 'selected-department-id' });
	const selectedDepartmentItem = formatDepartmentItem(selectedDepartmentMock);

	mockGetDepartment.mockResolvedValueOnce({ department: selectedDepartmentMock });

	mockGetDepartments.mockResolvedValueOnce({
		departments: [...departmentsList, createFakeDepartment({ _id: 'selected-department-id' })],
		count: 10,
		offset: 0,
		total: 10,
	});

	const { result } = renderHook(() => useDepartmentsList({ filter: '', selectedDepartmentId: selectedDepartmentMock._id }), {
		wrapper: appRoot.build(),
	});

	await waitFor(() => expect(result.current.isFetching).toBe(false));
	expect(mockGetDepartments).toHaveBeenCalled();
	expect(mockGetDepartment).toHaveBeenCalled();
	expect(result.current.data.length).toBe(11);
	expect(result.current.data).toEqual([...departmentItems, selectedDepartmentItem]);
});
